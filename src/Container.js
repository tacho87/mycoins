import React from "react";
import FetchCoins from "./helpers/getCoins.js";
import CrawlCoins from "./helpers/crawlCoins.js";
import FetchCoinPrice from "./helpers/getCoinPrice.js";
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
			totalPrice: 0.0
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
			email = prompt("What is your email?");
			localStorage.setItem("email", email);
		}
		this.setState({ email: email }, () => {
			try {
				this.initFireBase();
				this.fetchClientCrypto();

				//Fetch each coin price
				setInterval(this.fetchCoinPricesAndCalculate.bind(this), 60000);
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
	//Handlers
	addNewCrypto() {
		this.db
			.collection("Crypto")
			.add({ CoinName: "", Symbol: "", Amount: 0, email: this.state.email })
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
				Amount: this.state.mycoins[index].Amount,
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
		if (t === "Amount") coins[index].Amount = parseFloat(e.target.value);

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
	fetchCoinPricesAndCalculate() {
		//This is a slow proccess due to api constraints

		this.state.mycoins.map(async (e, i) => {
			try {
				let price = await FetchCoinPrice(e.Symbol);
				e.CurrentPrice = price.USD;
				e.USDMyPrice = e.CurrentPrice * e.Amount;
				this.forceUpdate();
			} catch (e) {
				console.error("failed to fetch ", e.Symbol);
			}
			let coins = this.state.mycoins.sort(
				(a, b) => b.USDMyPrice - a.USDMyPrice
			);
			this.setState({ mycoins: coins });
			this.calculateTotalAmount();
		});
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
					Index: {i + 1}
					<button
						className="btn btn-default pull-right"
						onClick={e => {
							this.fetchClientCrypto();
						}}>
						<i className="fa fa-refresh" aria-hidden="true" />
					</button>
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
							Amount: {Numeral(e.Amount).format("0,0.00000000000")}
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
						{Numeral(e.CurrentPrice).format("$0,0.000")}
					</p>
					<p className="text-success">
						<strong>What I have:</strong>{" "}
						{Numeral(e.USDMyPrice).format("$0,0.000")}
					</p>
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

	render() {
		return (
			<div className="col-sm-12 col-xs-12">
				<div className="row">
					<div className="col-sm-12 col-xs-12">
						<h4 className="text-center">Crypto Price Tracker</h4>
					</div>
					<div className="col-sm-5 col-xs-5">
						<p>List of Coins {this.state.coins.length + 1}</p>
						<button className="btn btn-info" onClick={this.fetchAllCoins}>
							Fetch all Coins
						</button>
						{this.renderCoins()}
					</div>
					<div className="col-sm-7 col-xs-7">
						<p>
							My Coins ({this.state.mycoins.length}){" "}
							<label className="text-success">
								{Numeral(this.state.totalPrice).format("$0,0.000")}
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
								window.location.reload;
							}}>
							Logoff
						</button>
						<br /> <br />
						{this.renderMyCoins()}
					</div>
				</div>
			</div>
		);
	}
}
