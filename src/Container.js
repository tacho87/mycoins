import React from "react";
import FetchCoins from "./helpers/getCoins.js";
import CrawlCoins from "./helpers/crawlCoins.js";
import FetchCoinPrice from "./helpers/getCoinPrice.js";
import Numeral from "numeral";

export default class Container extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      coins: [],
      mycoins: [
        {
          Symbol: "BTC",
          CoinName: "Bitcoin",
          Amount: 0.01310388,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "DOGE",
          CoinName: "Dogecoin",
          Amount: 5985,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "XLM",
          CoinName: "Stellar",
          Amount: 3190.38243246,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "BURST",
          CoinName: "Burst",
          Amount: 1496.25,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "SC",
          CoinName: "Siacoin",
          Amount: 997.5,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "NXT",
          CoinName: "NEXT",
          Amount: 585.69825782,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "XRP",
          CoinName: "Ripple",
          Amount: 218.05156623,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "GRC",
          CoinName: "Gridcoin Research",
          Amount: 99.85,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "DGB",
          CoinName: "DigiByte",
          Amount: 99.75,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "FLDC",
          CoinName: "FoldingCoin",
          Amount: 79.8,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "PINK",
          CoinName: "Pinkcoin",
          Amount: 49.875,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "BTS",
          CoinName: "BitShares",
          Amount: 39.9,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "EMC2",
          CoinName: "Einstenium",
          Amount: 1.997,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "ETH",
          CoinName: "Ethereum",
          Amount: 0.212631,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        },
        {
          Symbol: "BCH",
          CoinName: "Bitcoin Cash",
          Amount: 0.00955,
          CurrentPrice: 0, //Price of crypto fetched
          USDMyPrice: 0 //CurrentPrice *Amount
        }
      ],
      totalPrice: 0.0
    };
  }
  async componentDidMount() {
    try {
      let coins = localStorage.getItem("coinlist");

      if (!coins) coins = CrawlCoins(await FetchCoins());
      else coins = JSON.parse(coins);

      this.setState({ coins: [...coins] }, () => {
        localStorage.setItem("coinlist", JSON.stringify(coins));
        this.fetchCoinPricesAndCalculate();
      });
      //Fetch each coin price
    } catch (e) {
      alert(e);
    }
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
      this.calculateTotalAmount();
    });
  }

  renderCoins() {
    let border = {
      border: "solid thin black",
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
        </div>
      );
    });
  }
  renderMyCoins() {
    let border = {
      border: "solid thin black",
      borderRadius: "4px",
      padding: "10px"
    };
    return this.state.mycoins.map((e, i) => {
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
            <strong>Amount:</strong>{" "}
            {Numeral(e.Amount).format("0,0.0000000000000")}
          </p>
          <p>
            <strong>Current Price:</strong>{" "}
            {Numeral(e.CurrentPrice).format("$0,0.000")}
          </p>
          <p>
            <strong>What I have:</strong>{" "}
            {Numeral(e.USDMyPrice).format("$0,0.000")}
          </p>
        </div>
      );
    });
  }
  calculateTotalAmount() {
    let totalPrice = 0.0;
    this.state.mycoins.map(e => (totalPrice = totalPrice + e.USDMyPrice));
    this.setState({ totalPrice: totalPrice });
  }
  render() {
    return (
      <div className="col-sm-12 col-xs-12">
        <div className="row">
          <div className="col-sm-5 col-xs-5">
            <p>List of Coins {this.state.coins.length + 1}</p>
            {this.renderCoins()}
          </div>
          <div className="col-sm-7 col-xs-7">
            <p>My Coins {Numeral(this.state.totalPrice).format("$0,0.000")}</p>
            {this.renderMyCoins()}
          </div>
        </div>
      </div>
    );
  }
}
