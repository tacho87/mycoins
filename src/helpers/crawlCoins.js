const crawlCoins = json => {
  debugger;
  //Specific to api

  let coinlist = [];
  for (let i in json.Data) {
    coinlist.push(json.Data[i]);
  }

  return coinlist;
};
export default crawlCoins;
