const fetchCoins = callback => {
  return new Promise((resolve, reject) => {
    var myInit = {
      method: "GET"
    };

    fetch("https://min-api.cryptocompare.com/data/all/coinlist", myInit)
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
export default fetchCoins;
