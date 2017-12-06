import React from "react";
import FetchCoins from "./helpers/getCoins.js";
import CrawlCoins from "./helpers/crawlCoins.js";
import Numeral from "numeral";

export default class Container extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      coins: []
    };
  }
  async componentDidMount() {
    try {
      let coins = localStorage.getItem("coinlist");
      if (!coins) {
        let response = await FetchCoins();
        coins = CrawlCoins(response);
      } else {
        coins = JSON.parse(coins);
      }
      this.setState({ coins: [...coins] }, () =>
        localStorage.setItem("coinlist", JSON.stringify(coins))
      );
      debugger;
    } catch (e) {
      debugger;
      alert(e);
    }
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
          Index: {i}
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
  render() {
    return (
      <div className="col-sm-12 col-xs-12">
        <div className="row">
          <div className="col-sm-5 col-xs-5">
            <p>List of Coins</p>
            {this.renderCoins()}
          </div>
          <div className="col-sm-7 col-xs-7">
            <p>My Coins</p>
          </div>
        </div>
      </div>
    );
  }
}
