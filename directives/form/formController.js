Dhis2Api.directive('datavaluesForm', function() {
	return {
		restrict: 'E',
		scope: {accessor: "=", role: "@", enabled: "="},
		templateUrl: 'directives/form/formView.html',
		link: function(scope, element, attrs) {
			// Public interface
			$.extend(scope.accessor, {
				initialized: true,
				isInputSelected: scope.isInputSelected,
				getDataElement: scope.getDataElement,
				setDataElement: scope.setDataElement,
				clear: scope.init
			});

			scope.init();
		},		
		controller: function($scope, $filter, $timeout, Datasets) {
			var $orderBy = $filter('orderBy');

			$scope.getDataElement = function() {
				return {
					dataset: $scope.dataset,
					period: $scope.period,
					organisationUnit: $scope.organisationUnit,
					categoryCombo: $scope.dataset && dhis2.de.dataSets[$scope.dataset.id] ? 
						dhis2.de.dataSets[$scope.dataset.id].categoryCombo : null,
					attributes: $scope.attributes,
					currentPeriodOffset: $scope.currentPeriodOffset
				};
			};
			
			$scope.setDataElement = function(de) {
				$scope.dataset = _($scope.datasets)
					.detect(function(ds) { return ds.id == de.dataset.id; });
				$scope.currentPeriodOffset = de.currentPeriodOffset;
				$scope.datasetSelected();
				
				$scope.organisationUnit = _($scope.organisationUnits)
					.detect(function(ou) { return ou.id == de.organisationUnit.id; });
				$scope.period = _($scope.periods)
					.detect(function(pe) { return pe.id == de.period.id; });
				$scope.attributes = _.clone(de.attributes);
			};
			
			$scope.isReadRole = function() {
				return $scope.role == "read";
			}
					
			/**
			 * Inits model
			 */
			$scope.init = function() {
					$scope.currentPeriodOffset = 0;
					$scope.datasets = [];
					$scope.attributes = [];
					$scope.categories = [];
					$scope.dataset = null;
					clearSelection();
					populateDataSets();
			};
			
			/**
			 * Clears model stuff
			 */
			var clearSelection = function() {
					$scope.periods = [];
					$scope.organisationUnits = [];
					$scope.organisationUnit = null;
					$scope.period = null;
					$scope.categories = [];
					$scope.attributes = [];
			};
		
			/**
			 * Populate attributes according to dataset 
			 */
			var populateAttributes = function() {
					$scope.categories = $scope.dataset ? 
						(dhis2.de.getCategories($scope.dataset.id) || []) : [];
			};

			/**
			 * Populate datasets
			 */
			var populateDataSets = function() {
					$scope.datasets = Datasets.query();
			};

			/**
			 * Populate periods according to dataset
			 */
			var populatePeriods = function() {
					var periods = dhis2.period.generator.generateReversedPeriods($scope.dataset.periodType, $scope.currentPeriodOffset);
					periods = dhis2.period.generator.filterOpenPeriods($scope.dataset.periodType, periods, 0);
					$scope.periods = periods;
			};
			
			/**
			 * Decrease year offset
			 */
			$scope.prevYear = function() {
				$scope.currentPeriodOffset--;			
				populatePeriods();
			};

			/**
			 * Increase year offset
			 */
			$scope.nextYear = function() {
				$scope.currentPeriodOffset++;
				populatePeriods();
			};
		
			/**
			 * Populate organisationUnits according to dataset
			 */
			var populateOrgUnits = function() {
					$scope.organisationUnits = $orderBy($scope.dataset.organisationUnits, function(organisationUnit) {
							return organisationUnit.displayName.trim();
					});
			};

			/**
			 * Returns true|false according to selection of attributes is complete or not 
			 */
			$scope.isInputSelected = function() {
					return (
							$scope.organisationUnit &&
							$scope.dataset &&
							$scope.period &&
							$scope.allAttributesSelected()
					);
			};
			
			$scope.allAttributesSelected = function() {
					return $scope.attributes.length == $scope.categories.length &&
				         _($scope.attributes).all(_.identity);
			}
		
			/**
			 * DataSet selected
			 */
			$scope.datasetSelected = function() {
					//Inits model
					clearSelection();

					//No dataset selected -> reset
					if (!$scope.dataset) {
							return;
					}

					//Populate attributes				
					populateAttributes();

					//Populate periods
					populatePeriods();

					//Populate orgunits
					populateOrgUnits();
			};
		}
	};
})
