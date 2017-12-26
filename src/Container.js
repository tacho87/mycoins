import React from "react";
import FetchCoins from "./helpers/getCoins.js";
import CrawlCoins from "./helpers/crawlCoins.js";
import FetchCoinPrice from "./helpers/getCoinPrice.js";
import FetchCoinPricesAndExtras from "./helpers/getCoinPricesAndExtras.js";
import Numeral from "numeral";
import { debounce, throttle } from "lodash";
import getQueryStringParameterByName from './helpers/queryString.js';

//Anastacio Gianareas Palm

const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

export default class Container extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			email: "",
			coins: [],
			mycoins: [],
			totalPrice: 0.0,
			showPredictor: false,
			predictorObject: null,
			investedSoFar: 0,
			preview: false,
			loading: false,
			cost: localStorage.getItem("cost") ? parseFloat(localStorage.getItem("cost")) : 0
		};
		this.db = null;
		this.addNewCryptoHandler = debounce(this.addNewCrypto, 2000);
		this.updateCryptoHandler = debounce(this.updateCrypto, 2000);
		this.deleteCryptoHandler = debounce(this.deleteCrypto, 1000);
		this.changeCrypto = this.changeCrypto.bind(this);
		this.fetchAllCoins = this.fetchAllCoins.bind(this);
	}

	componentDidMount() {
		let email;

		if (getQueryStringParameterByName("user")) {
			email = getQueryStringParameterByName("user");
			this.setState({
				preview: true
			})
		} else {
			email = localStorage.getItem("email");
			if (!email) {
				console.log(email)
				try {
					email = prompt("What is your email?").toLocaleLowerCase();
				} catch (e) { }
				localStorage.setItem("email", email);
			}
		}
		if (email) {
			this.setState({ email: email }, () => {
				try {
					this.initFireBase();
					this.fetchClientCrypto();
				} catch (e) {
					alert(e);
				}
			});
		}
		else {
			alert("You forgot to add an email, please refresh");
		}

	}
	//Logic
	calculateTotalAmount() {
		const { mycoins } = this.state;
		let totalPrice = 0.0;
		mycoins.map(e => (totalPrice = totalPrice + e.USDMyPrice));
		this.setState({ totalPrice: totalPrice });
	}
	predictorCalculate() {
		const { predictorObject } = this.state;

		predictorObject.USDMyPrice =
			predictorObject.CurrentPrice * predictorObject.Amount;
		this.setState({
			predictorObject: Object.assign({}, predictorObject)
		});
	}

	//Handlers

	predictor(coin) {
		let newCoin = JSON.parse(JSON.stringify(coin)); //To avoid shallow from object.assign
		newCoin.OriginalAmount = newCoin.Amount;
		this.setState({
			predictorObject: newCoin
		});
	}
	addNewCrypto() {
		const { email, loading } = this.state;
		this.setState({ loading: true });
		this.db
			.collection("Crypto")
			.add({
				CoinName: "",
				Symbol: "",
				Amount: 0,
				email: email
			})
			.then(() => {
				this.fetchClientCrypto();
				this.setState({ loading: false });
			})
			.catch(error => {
				console.error("Error adding document: ", error);
			});
	}
	updateCrypto(index) {
		const { mycoins, loading } = this.state;
		this.setState({ loading: true });
		this.db
			.collection("Crypto")
			.doc(mycoins[index].id)
			.update({
				Amount:
				parseFloat(mycoins[index].Amount) !== NaN
					? parseFloat(mycoins[index].Amount)
					: 0,
				CoinName: mycoins[index].CoinName,
				Symbol: mycoins[index].Symbol
			})
			.then(() => {
				//this.fetchClientCrypto();
				this.setState({ loading: false });
			})
			.catch(error => {
				console.error("Error adding document: ", error);
			});
	}
	deleteCrypto(index) {
		if (window.confirm("Are you sure you want to delete?")) {
			const { mycoins, loading } = this.state;
			this.setState({ loading: true });
			this.db
				.collection("Crypto")
				.doc(mycoins[index].id)
				.delete()
				.then(() => {
					this.fetchClientCrypto();
					this.setState({ loading: false });
				})
				.catch(error => {
					console.error("Error adding document: ", error);
				});
		}
	}
	changeCrypto(index, e, t) {
		let coins = [...this.state.mycoins];

		if (t === "CoinName") coins[index].CoinName = e.target.value;
		if (t === "Symbol") coins[index].Symbol = e.target.value;
		if (t === "Amount") coins[index].Amount = e.target.value;

		this.setState({ mycoins: coins, loading: true });
		this.updateCryptoHandler(index);
	}

	//DB INIT

	initFireBase() {
		firebase.initializeApp({
			apiKey: "AIzaSyB_QyqHnwxq78orNOy6k4qgqFUep_js4h4",
			authDomain: "mycryptocoins-9dd8c.firebaseapp.com",
			projectId: "mycryptocoins-9dd8c"
		});
		this.db = firebase.firestore();
	}

	//Fetches
	async fetchAllCoins() {
		let coins = localStorage.getItem("coinlist");

		if (!coins) coins = CrawlCoins(await FetchCoins());
		else coins = JSON.parse(coins);

		coins.sort((a, b) => b.TotalCoinSupply - a.TotalCoinSupply);
		this.setState({ coins: [...coins] }, () => {
			localStorage.setItem("coinlist", JSON.stringify(coins));
		});
	}
	//TODO: Not finished, querySnapshot.data(); does not work
	//      Create CRU for amout next to total amout.
	fetchClientInvestedAmount() {
		if (this.db === null) return;

		const { investedSoFar, email, loading } = this.state;
		this.setState({ loading: true });
		this.db
			.collection("Invested")
			.where("email", "==", email)
			.get()
			.then(querySnapshot => {

				let invested = Object({}, investedSoFar);
				invested = querySnapshot.data();
				invested.id = querySnapshot.is;

				this.setState({
					investedSoFar: invested,
					loading: false
				});
			})
			.then(() => { })
			.catch(error => {
				console.log("Error getting documents: ", error);
			});
	}
	fetchClientCrypto() {
		if (this.db === null) return;

		const { email, loading } = this.state;
		this.setState({ loading: true });
		this.db
			.collection("Crypto")
			.where("email", "==", email)
			.get()
			.then(querySnapshot => {
				let mycoins = [];
				let coin = {};
				querySnapshot.forEach(function (doc) {
					coin = doc.data();
					coin.id = doc.id;

					mycoins.push(coin);
				});

				this.setState({
					mycoins: mycoins
				});
			})
			.then(() => {
				console.info("fetched client coins");
				this.fetchCoinPricesAndCalculate();
				this.setState({ loading: false });
			})
			.catch(error => {
				console.log("Error getting documents: ", error);
			});
	}
	async fetchCoinPricesAndCalculate() {
		const { mycoins } = this.state;
		let symbols = mycoins.map(e => e.Symbol).join();

		let responseCoins = null;
		try {
			responseCoins = await FetchCoinPricesAndExtras(symbols);
		} catch (e) {
			console.error("failed to fetch ", e);
		}

		mycoins.map((e, i) => {
			if (responseCoins != null && responseCoins[e.Symbol]) {
				let COIN = responseCoins[e.Symbol].USD;
				e.CurrentPrice = COIN.PRICE;
				e.Market = COIN.MARKET;
				e.LatMarket = COIN.LASTMARKET;
				e.MarketCap = COIN.MKTCAP;
				e.Open24Hour = COIN.OPEN24HOUR;
				e.High24Hour = COIN.HIGH24HOUR;
				e.Low24Hour = COIN.LOW24HOUR;
				e.Change24Hour = COIN.CHANGE24HOUR;
				e.OpenDay = COIN.OPENDAY;
				e.HighDay = COIN.HIGHDAY;
				e.LowDay = COIN.LOWDAY;
				e.ChangeDay = COIN.CHANGEDAY;

				e.USDMyPrice = e.CurrentPrice * e.Amount;
			} else {
				alert(
					`${e.Name} Symbol ${e.Symbol} might be wrong, we could not find any trace!`
				);
				e.USDMyPrice = 0;
			}
			this.forceUpdate();
		});
		let coins = mycoins.sort((a, b) => b.USDMyPrice - a.USDMyPrice);
		this.setState({ mycoins: coins });
		this.calculateTotalAmount();
	}
	async fetchOnePriceAndUpdateList(index, Symbol) {
		try {
			let price = await FetchCoinPrice(Symbol);
			let coins = [...this.state.coins];
			coins[index].Amount = price.USD;
			this.setState({
				coins: coins
			});
		} catch (e) {
			console.error("error fetching ", e);
		}
	}

	//RENDERS

	renderCoins() {
		let border = {
			border: "solid thin #cac7c7",
			borderRadius: "4px",
			padding: "10px"
		};
		const { coins } = this.state;
		return coins.map((e, i) => {
			return (
				<div key={i} style={border}>
					Index: {i + 1}
					<p>
						<strong>Name:</strong> {e.CoinName}
					</p>
					<p>
						<strong>Symbol:</strong> {e.Symbol}
					</p>
					<p>
						<strong>Total Coins:</strong>{" "}
						{Numeral(e.TotalCoinSupply).format("0,0")}
					</p>
					{e.Amount ? (
						<p>
							<strong>USD Price:</strong>{" "}
							{Numeral(e.Amount).format("$0,0.000000000")}
						</p>
					) : (
							<span />
						)}
					<button
						className="btn btn-info"
						onClick={() => {
							this.fetchOnePriceAndUpdateList(i, e.Symbol);
						}}>
						Fetch Price
					</button>
				</div>
			);
		});
	}

	renderMyCoins() {
		let border = {
			border: "solid thin #cac7c7",
			borderRadius: "4px",
			padding: "10px"
		};

		const { mycoins, preview } = this.state;
		return mycoins.map((e, i) => {
			let goingUp = false;
			if (e.Change24Hour > 0)
				goingUp = true;

			return (

				<div key={i} style={border}>
					<div className="row">
						<div className="col-xs-12 col-sm-12">
							<label className="text text-primary pull-left">
								{i + 1} - {e.CoinName}
							</label>
							<button
								className="btn btn-default pull-right"
								onClick={() => {
									this.predictor(e);
									this.setState({ showPredictor: true });
								}}>
								<i
									className="fa fa-code-fork"
									aria-hidden="true"
								/>
							</button>
							<button
								className="btn btn-default pull-right "
								onClick={e => {
									this.fetchClientCrypto();
								}}>
								<i
									className="fa fa-refresh"
									aria-hidden="true"
								/>
							</button>
						</div>

						<div className="col-sm-6 col-xs-6">
							<p>
								<strong>Name: </strong>
								{preview ? <label>{e.CoinName}</label> :
									<input
										type="text"
										className="form-control"
										value={e.CoinName}
										onChange={e => {
											e.persist();
											this.changeCrypto(i, e, "CoinName");
										}}
									/>}
							</p>
							<p>
								<strong>Symbol: </strong>
								{preview ? <label>{e.Symbol}</label> :
									<input
										className="form-control"
										type="text"
										value={e.Symbol}
										onChange={e => {
											e.persist();
											this.changeCrypto(i, e, "Symbol");
										}}

									/>
								}
							</p>
							<p>
								<strong>
									Amount:{" "}
									{Numeral(e.Amount).format(
										"0,0.00000000000"
									)}
								</strong>
								{preview ? <label>{e.Amount}</label> :
									<input
										type="text"
										className="form-control"
										value={e.Amount}
										onChange={e => {
											e.persist();
											this.changeCrypto(i, e, "Amount");
										}}
									/>
								}
							</p>
							<p>
								<strong>Current Price:</strong>{" "}
								{Numeral(e.CurrentPrice).format("$0,0.0000")}
							</p>
							<p className="text-success">
								<strong>What I have:</strong>{" "}
								{Numeral(e.USDMyPrice).format("$0,0.0000")}
							</p>
							<p>
								<strong>Market Cap:</strong>{" "}
								{Numeral(e.MarketCap).format("$0,0.0000")}
							</p>
						</div>
						<div className="col-sm-6 col-xs-6">
							{goingUp ?

								<div><h1 className="text text-success text-center">
									<i className=" faa-flash animated fa fa-arrow-up" aria-hidden="true"></i>
								</h1>
								</div> :
								<div>
									<h1 className="text text-danger text-center">
										<i className=" faa-flash animated fa fa-arrow-down" aria-hidden="true"></i>
									</h1>
								</div>}
							<h5 className="text text-primary">Open 24 Hours</h5>
							<p>
								<strong>Change 24 Hours:</strong>{" "}
								{e.Change24Hour > 0 ? (
									<label className="text text-success">
										{Numeral(e.Change24Hour).format(
											"$0,0.0000"
										)}
									</label>
								) : (
										<label className="text text-danger">
											{Numeral(e.Change24Hour).format(
												"$0,0.0000"
											)}
										</label>
									)}
							</p>
							<p>
								<strong>Open 24 Hour: </strong>{" "}
								{Numeral(e.Open24Hour).format("$0,0.0000")}
							</p>
							<p>
								<strong>High 24 Hours:</strong>{" "}
								{Numeral(e.High24Hour).format("$0,0.0000")}
							</p>
							<p>
								<strong>Low 24 Hours:</strong>{" "}
								{Numeral(e.Low24Hour).format("$0,0.0000")}
							</p>

						</div>
					</div>
					{preview ? <span></span> :
						<button
							className="btn btn-danger"
							onClick={e => {
								this.deleteCryptoHandler(i);
							}}>
							Delete Coin
					</button>
					}
				</div>
			);
		});
	}

	renderPredictor() {
		const { showPredictor, predictorObject } = this.state;
		if (!showPredictor) return <span />;

		return (
			<div className="col-sm-12 col-xs-12">
				<button
					className="btn btn-warning pull-right"
					onClick={e => {
						this.setState({
							showPredictor: false,
							predictorObject: null
						});
					}}>
					<i className="fa fa-times-circle" aria-hidden="true" />{" "}
					Close
				</button>
				<p>
					<strong>Name: {predictorObject.CoinName}</strong>
				</p>
				<p>
					<strong>Symbol: {predictorObject.Symbol}</strong>
				</p>
				<p>
					<strong>
						Amount:{" "}
						{Numeral(predictorObject.Amount).format(
							"0,0.00000000000"
						)}
					</strong>
					<input
						type="text"
						className="form-control"
						value={predictorObject.Amount}
						onChange={e => {
							let pObj = Object.assign(
								{},
								this.state.predictorObject
							);
							pObj.Amount = e.target.value;
							this.setState(
								{
									predictorObject: pObj
								},
								this.predictorCalculate
							);
						}}
					/>
				</p>
				<p>
					<strong>Current Price:</strong>{" "}
					{Numeral(predictorObject.CurrentPrice).format("$0,0.0000")}
					<input
						type="text"
						className="form-control"
						value={predictorObject.CurrentPrice}
						onChange={e => {
							let pObj = Object.assign(
								{},
								this.state.predictorObject
							);
							pObj.CurrentPrice = e.target.value;
							this.setState(
								{
									predictorObject: pObj
								},
								this.predictorCalculate
							);
						}}
					/>
				</p>
				<p className="text-success">
					<strong>What I have:</strong>{" "}
					{Numeral(predictorObject.USDMyPrice).format("$0,0.0000")}
				</p>
				<hr style={{ borderTop: "solid thin #75b5bb" }} />
				<br />
				<p className="text text-info">
					<i>
						Currently you have{" "}
						<strong>{predictorObject.OriginalAmount}</strong> Coins.
					</i>
				</p>
				<p className="text text-info">
					<i>
						It will cost you to get{" "}
						<strong>
							{predictorObject.Amount -
								predictorObject.OriginalAmount}
						</strong>{" "}
						more at a price{" "}
						<strong>{predictorObject.CurrentPrice}</strong>:{" "}
						<strong>
							{Numeral(
								(predictorObject.Amount -
									predictorObject.OriginalAmount) *
								predictorObject.CurrentPrice
							).format("$0,0.0000")}
						</strong>
					</i>
				</p>
			</div>
		);
	}
	render() {
		const { mycoins, showPredictor, totalPrice, coins, loading, preview, cost, email } = this.state;
		if (showPredictor) return this.renderPredictor();

		let isLoading = loading ? <div style={{
			position: "fixed", margin: "auto", textAlign: "center", zIndex: "999",
			left: "45%",
			top: "50%",
			fontSize: "24px",
			fontWeight: "600"
		}}>
			<p className="text text-warning"> Loading...</p>
		</div> : <span></span>

		let buttons = (!preview ?
			<div>
				<button
					className="btn btn-primary"
					onClick={
						e => {
							this.addNewCryptoHandler();
						}
					} >
					Add New Coin
						</button > {" "}
				{" "}
				<button
					className="btn btn-warning"
					onClick={e => {
						localStorage.clear();
						window.location.reload();
					}}>
					Logoff
						</button>
			</div> :
			<span></span>)

		return (
			<div className="col-sm-12 col-xs-12">
				<div className="row">
					<div className="col-sm-12 col-xs-12">
						<h4 className="text-center">Crypto Price Tracker - {email}</h4>
					</div>
					{isLoading}

					<div className="col-sm-12 col-xs-12">
						<div className="row">
							<p>
								My Coins ({mycoins.length}){" "}
								<label className="text-success">
									{Numeral(totalPrice).format("$0,0.000")}
								</label>

								{cost > 0 ?
									<label className="text-primary">
										({Numeral(((totalPrice - cost) / cost)).format("0.00%")})
								</label> :
									<span />}

								<button className="btn btn-info btn-sm" onClick={(e) => {
									let quantity = prompt("Please enter how much crypto you bought in USD dolars for. (Example, $650 <- in bitcoins, eth) ");
									if (parseFloat(quantity)) {
										this.setState({ cost: quantity }, () => {
											localStorage.setItem("cost", this.state.cost)
										})
									}
								}}> Expenses {Numeral(cost).format("$0,0.000")}</button>

							</p>
							{buttons}

							<br /> <br />
							{this.renderMyCoins()}
						</div>
					</div>

					<div className="col-sm-12 col-xs-12">
						<div className="row">
							<p>
								List of Coins{" "}
								{coins.length === 0 ? 0 : coins.length + 1}
							</p>
							<button
								className="btn btn-info"
								onClick={this.fetchAllCoins}>
								Fetch all Coins
						</button>
							{this.renderCoins()}
						</div>
					</div>
				</div>
			</div>
		);
	}
}
