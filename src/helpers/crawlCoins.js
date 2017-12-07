const crawlCoins = json => {
  debugger;
  //Specific to api

  let coinlist = [];
  for (let i in json.Data) {
    coinlist.push({
      ImageUrl: json.Data[i].ImageUrl,
      Name: json.Data[i].Name,
      Symbol: json.Data[i].Symbol,
      CoinName: json.Data[i].CoinName,
      TotalCoinSupply: json.Data[i].TotalCoinSupply
    });
  }

  return coinlist;
};
export default crawlCoins;
