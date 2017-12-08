import React from "react";
import FetchCoins from "./helpers/getCoins.js";
import CrawlCoins from "./helpers/crawlCoins.js";
import FetchCoinPrice from "./helpers/getCoinPrice.js";
import FetchCoinPricesAndExtras from "./helpers/getCoinPricesAndExtras.js";
import Numeral from "numeral";
import { debounce, throttle } from "lodash";

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
			investedSoFar: 0
		};
		this.db = null;
		this.addNewCryptoHandler = debounce(this.addNewCrypto, 2000);
		this.updateCryptoHandler = debounce(this.updateCrypto, 2000);
		this.deleteCryptoHandler = debounce(this.deleteCrypto, 1000);
		this.changeCrypto = this.changeCrypto.bind(this);
		this.fetchAllCoins = this.fetchAllCoins.bind(this);
	}

	componentDidMount() {
		let email = localStorage.getItem("email");
		if (!email) {
			email = prompt("What is your email?").toLocaleLowerCase();
			localStorage.setItem("email", email);
		}
		this.setState({ email: email }, () => {
			try {
				this.initFireBase();
				this.fetchClientCrypto();

				//Fetch each coin price
				//	setInterval(this.fetchCoinPricesAndCalculate.bind(this), 60000);
			} catch (e) {
				alert(e);
			}
		});
	}
	//Logic
	calculateTotalAmount() {
		let totalPrice = 0.0;
		this.state.mycoins.map(e => (totalPrice = totalPrice + e.USDMyPrice));
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
		this.db
			.collection("Crypto")
			.add({
				CoinName: "",
				Symbol: "",
				Amount: 0,
				email: this.state.email
			})
			.then(() => {
				//this.fetchClientCrypto();
			})
			.catch(error => {
				console.error("Error adding document: ", error);
			});
	}
	updateCrypto(index) {
		this.db
			.collection("Crypto")
			.doc(this.state.mycoins[index].id)
			.update({
				Amount:
					parseFloat(this.state.mycoins[index].Amount) !== NaN
						? parseFloat(this.state.mycoins[index].Amount)
						: 0,
				CoinName: this.state.mycoins[index].CoinName,
				Symbol: this.state.mycoins[index].Symbol
			})
			.then(() => {
				//this.fetchClientCrypto();
			})
			.catch(error => {
				console.error("Error adding document: ", error);
			});
	}
	deleteCrypto(index) {
		if (window.confirm("Are you sure you want to delete?")) {
			this.db
				.collection("Crypto")
				.doc(this.state.mycoins[index].id)
				.delete()
				.then(() => {
					this.fetchClientCrypto();
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

		this.setState({ mycoins: coins });
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
		debugger;
	}

	//Fetches
	async fetchAllCoins() {
		debugger;
		let coins = localStorage.getItem("coinlist");

		if (!coins) coins = CrawlCoins(await FetchCoins());
		else coins = JSON.parse(coins);

		coins.sort((a, b) => b.TotalCoinSupply - a.TotalCoinSupply);
		this.setState({ coins: [...coins] }, () => {
			localStorage.setItem("coinlist", JSON.stringify(coins));
		});
	}

	fetchClientCrypto() {
		if (this.db === null) return;
		this.db
			.collection("Crypto")
			.where("email", "==", this.state.email)
			.get()
			.then(querySnapshot => {
				let mycoins = [];
				let coin = {};
				querySnapshot.forEach(function(doc) {
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
			})
			.catch(error => {
				console.log("Error getting documents: ", error);
			});
	}
	async fetchCoinPricesAndCalculate() {
		let symbols = this.state.mycoins.map(e => e.Symbol).join();

		let responseCoins = null;
		try {
			responseCoins = await FetchCoinPricesAndExtras(symbols);
		} catch (e) {
			console.error("failed to fetch ", e);
		}

		this.state.mycoins.map((e, i) => {
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
		let coins = this.state.mycoins.sort(
			(a, b) => b.USDMyPrice - a.USDMyPrice
		);
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
		return this.state.coins.map((e, i) => {
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
		return this.state.mycoins.map((e, i) => {
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
								<input
									type="text"
									className="form-control"
									value={e.CoinName}
									onChange={e => {
										e.persist();
										this.changeCrypto(i, e, "CoinName");
									}}
								/>
							</p>
							<p>
								<strong>Symbol: </strong>
								<input
									className="form-control"
									type="text"
									value={e.Symbol}
									onChange={e => {
										e.persist();
										this.changeCrypto(i, e, "Symbol");
									}}
								/>
							</p>
							<p>
								<strong>
									Amount:{" "}
									{Numeral(e.Amount).format(
										"0,0.00000000000"
									)}
								</strong>
								<input
									type="text"
									className="form-control"
									value={e.Amount}
									onChange={e => {
										e.persist();
										this.changeCrypto(i, e, "Amount");
									}}
								/>
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
							<h5 className="text text-primary">Open Day</h5>

							<p>
								<strong>Change Day:</strong>{" "}
								{e.ChangeDay > 0 ? (
									<label className="text text-success">
										{Numeral(e.ChangeDay).format(
											"$0,0.0000"
										)}
									</label>
								) : (
									<label className="text text-danger">
										{Numeral(e.ChangeDay).format(
											"$0,0.0000"
										)}
									</label>
								)}
							</p>
							<p>
								<strong>Open Day:</strong>{" "}
								{Numeral(e.OpenDay).format("$0,0.0000")}
							</p>
							<p>
								<strong>High Day:</strong>{" "}
								{Numeral(e.HighDay).format("$0,0.0000")}
							</p>
							<p>
								<strong>Low Day:</strong>{" "}
								{Numeral(e.LowDay).format("$0,0.0000")}
							</p>

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
					<button
						className="btn btn-danger"
						onClick={e => {
							this.deleteCryptoHandler(i);
						}}>
						Delete Coin
					</button>
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
		if (this.state.showPredictor) return this.renderPredictor();

		return (
			<div className="col-sm-12 col-xs-12">
				<div className="row">
					<div className="col-sm-12 col-xs-12">
						<h4 className="text-center">Crypto Price Tracker</h4>
					</div>

					<div className="col-sm-12 col-xs-12">
						<p>
							My Coins ({this.state.mycoins.length}){" "}
							<label className="text-success">
								{Numeral(this.state.totalPrice).format(
									"$0,0.000"
								)}
							</label>
						</p>
						<button
							className="btn btn-primary"
							onClick={e => {
								this.addNewCryptoHandler();
							}}>
							Add New Coin
						</button>{" "}
						{" "}
						<button
							className="btn btn-warning"
							onClick={e => {
								localStorage.clear();
								window.location.reload();
							}}>
							Logoff
						</button>
						<br /> <br />
						{this.renderMyCoins()}
					</div>

					<div className="col-sm-12 col-xs-12">
						<p>List of Coins {this.state.coins.length + 1}</p>
						<button
							className="btn btn-info"
							onClick={this.fetchAllCoins}>
							Fetch all Coins
						</button>
						{this.renderCoins()}
					</div>
				</div>
			</div>
		);
	}
}
