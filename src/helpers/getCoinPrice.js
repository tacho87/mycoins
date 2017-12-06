const fetchCoinPrice = Symbol => {
  return new Promise((resolve, reject) => {
    var myInit = {
      method: "GET"
    };

    fetch(
      `https://min-api.cryptocompare.com/data/price?fsym=${Symbol}&tsyms=USD`,
      myInit
    )
      .then(function(response) {
        return response.json();
      })
      .then(function(response) {
        resolve(response);
      })
      .catch(function(e) {
        reject(e);
      });
  });
};
export default fetchCoinPrice;
