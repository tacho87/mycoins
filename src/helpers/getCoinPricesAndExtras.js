const fetchCoinPrices = Symbols => {
	return new Promise((resolve, reject) => {
		var myInit = {
			method: "GET"
		};

		fetch(
			`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${Symbols}&tsyms=USD`,
			myInit
		)
			.then(function(response) {
				return response.json();
			})
			.then(function(response) {
				resolve(response.RAW);
			})
			.catch(function(e) {
				reject(e);
			});
	});
};
export default fetchCoinPrices;
