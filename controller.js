c.controller("Page", ["$scope", "safeApply", "ioconfig", "ioquery", "ioapi",
	function($scope, safeApply, ioconfig, ioquery, ioapi) {

	// Model values for the form
	$scope.userGuid = "";
	$scope.apiKey = "";
	$scope.sourceGuids = [
		"821baa0c-1902-4d68-a065-3b57eb107eb2",
		"e24e2bbb-dce6-4c0b-b906-dc80a8715bec",
		"ef7787e0-2312-4822-900e-0ce7bae785d5",
		"86e63801-4a73-4036-b71c-5fa42ef76490",
		"ca0c8893-0df6-40e5-96b4-1c56fb6f07ca",
		"5fd28f5b-5474-42ae-9019-c2141f3096c9",
		"dc405af6-6bd5-4698-aa6e-a4ece7cef020"
	].join("\n");
	$scope.targetUrl = "http://www.amazon.co.uk/AM-Arctic-Monkeys/dp/B00EXWBRRG";
	$scope.formLoading = false;

	// Returns all the source GUIDs as an array
	$scope.getAllGuids = function() {
		return $scope.sourceGuids.split("\n");
	}

	// Whether to enable the form for submission
	$scope.formSubmitEnabled = function() {
		var guidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
		var allGuidsValid = true;
		$scope.getAllGuids().map(function(guid) {
			if (!guid.match(guidRegex)) {
				allGuidsValid = false;
			}
		});
		return !$scope.formLoading && $scope.userGuid.length && $scope.apiKey.length && $scope.sourceGuids.length && $scope.targetUrl.length && allGuidsValid;
	}

	// Array of data sources we are querying
	$scope.sources = [];

	// Results mapped to a connector GUID
	$scope.results = {};

	// Array of columns mapped to a connector GUID
	$scope.columns = {};

	// Helper to get the columns for a specific connector GUID
	$scope.getColumns = function(guid) {
		if (!$scope.columns.hasOwnProperty(guid)) {
			return [];
		}
		return Object.keys($scope.columns[guid]);
	}

	// Gets the data when the form is submitted
	$scope.getData = function() {
		// First set the loading flag for the form
		$scope.formLoading = true;

		// Reset the variables for the rest of the state
		$scope.sources = [];
		$scope.results = {};

		// Configure the import.io client library with the provided credentials
		ioconfig.init({
			"auth": {
				"userGuid": $scope.userGuid,
				"apiKey": $scope.apiKey
			}
		});

		// Setup a simple fail handler to deal with any issues we may have
		var fail = function(text) {
			alert(text);
			$scope.formLoading = false;
			safeApply($scope);
		}

		// Download the data source from import.io
		ioapi.bucket("connector").get({ "id": $scope.getAllGuids() }).done(function(sources) {
			// Save the sources we got into the scope
			$scope.sources = sources;
			safeApply($scope);

			// Now do the query - we only need one, we can use one input and all of the extractor GUIDs at once
			ioquery.query({
				"input": {
					"webpage/url": $scope.targetUrl
				},
				"connectorGuids": $scope.getAllGuids()
			}, {
				"data": function(data) {
					data.map(function(row) {
						// Take each result and put it on to the results array
						if (!$scope.results.hasOwnProperty(row.connectorGuid)) {
							$scope.results[row.connectorGuid] = [];
						}
						$scope.results[row.connectorGuid].push(row.data);

						// Also update the list of columns for this source
						if (!$scope.columns.hasOwnProperty(row.connectorGuid)) {
							$scope.columns[row.connectorGuid] = {};
						}
						Object.keys(row.data).map(function(key) {
							if (!$scope.columns[row.connectorGuid].hasOwnProperty(key)) {
								$scope.columns[row.connectorGuid][key] = true;
							}
						});
					});
					safeApply($scope);
				}
			}).done(function() {
				$scope.formLoading = false;
				safeApply($scope);
			}).fail(function() {
				$scope.reloading = false;
				$scope.error = true;
				safeApply($scope);
			});
		}).fail(function() {
			fail("Unable to load data source. Please check your User GUID, API key, and data source GUID");
		});
	}

}]);