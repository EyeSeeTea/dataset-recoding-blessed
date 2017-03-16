Dhis2Api.directive('datavaluesForm', function() {
	return {
		restrict: 'E',
		scope: {accessor: "=", enabled: "="},
		templateUrl: 'directives/form/formView.html',
		link: function(scope, element, attrs) {
			// Public interface
			$.extend(scope.accessor, {
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
					attributes: loadTargetAttributeParams()
				};
			};

			$scope.setDataElement = function(de) {
				$scope.dataset = _($scope.datasets)
					.detect(function(ds) { return ds.id == de.dataset.id; });
				var currentYear = new Date().getFullYear();
				var deYear = parseInt(de.period.startDate.split("-"));
				$scope.currentPeriodOffset = deYear - currentYear;
				$scope.datasetSelected();
				
				$scope.organisationUnit = _($scope.organisationUnits)
					.detect(function(ou) { return ou.id == de.organisationUnit.id; });
				$scope.period = _($scope.periods)
					.detect(function(pe) { return pe.id == de.period.id; });
				$scope.attributes = de.attributes;
			};
					
			/**
			 * Inits model
			 */
			$scope.init = function() {
					$scope.currentPeriodOffset = 0;
					$scope.datasets = [];
					$scope.attributes = [];
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
					$scope.categories = [];
				
		      dhis2.de.currentDataSetId = null;
		      dhis2.de.currentOrganisationUnitId = null;
		      dhis2.de.currentCategories = [];
			};
		
			/**
			 * Populate attributes according to dataset 
			 */
			var populateAttributes = function() {
					dhis2.de.currentCategories = dhis2.de.getCategories(dhis2.de.currentDataSetId);
					$scope.categories = dhis2.de.currentCategories;
			};

			/**
			 * Populate datasets
			 */
			var populateDataSets = function() {
					$scope.datasets = Datasets.query();
					
					// TEST
					$scope.datasets.$promise.then(function() {
						$scope.dataset = $scope.datasets[0];
						$scope.datasetSelected()
						$scope.organisationUnit = $scope.organisationUnits[0];
						$scope.period = $scope.periods[0];
					});
			};

			/**
			 * Populate periods according to dataset
			 */
			var populatePeriods = function() {
					//$scope.currentPeriodOffset
					var periods = dhis2.period.generator.generateReversedPeriods($scope.dataset.periodType, $scope.currentPeriodOffset);
					periods = dhis2.period.generator.filterOpenPeriods($scope.dataset.periodType, periods, 0);
					$scope.periods = periods;
			};
			
			$scope.currentPeriodYear = function() {
				var currentYear = new Date().getFullYear(); 				
				return currentYear + $scope.currentPeriodOffset;
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
					if (
							$scope.organisationUnit &&
							$scope.dataset &&
							$scope.period &&
							dhis2.de.categoriesSelected()) {
							return true;
					}

					return false;
			};
		
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

					//Set
					dhis2.de.currentDataSetId = $scope.dataset.id;

					//Populate attributes				
					populateAttributes();

					//Populate periods
					populatePeriods();

					//Populate orgunits
					populateOrgUnits();
			};

		  /**
		   * A category (attribute) has been selected
		   */
		  $scope.categorySelected = function() {
		      //Check if every attribute has been selected
		      $scope.isInputSelected();
		      //Reload categoryComboOptions ids array
		      $scope.targetAttributeParams = loadTargetAttributeParams();
		  };
			
		  /**
		   * Returns current attributes ids values or NULL if there is something left without value
		   */
		  var loadTargetAttributeParams = function() {
		      var arrayIds = $("select[id^='category-']").map(function(i, el) {
		          return $(el).val();
		      });

		      var filteredArray = [];
		      for (var i = 0; i < arrayIds.length; i++) {
		          if (!arrayIds[i]) {
		              return null;
		          } else {
		              filteredArray.push(arrayIds[i]);
		          }
		      }
		      return filteredArray;
		  }
			
			/* Return the HTML ID for the category selector. dhis-web-dataentry uses this
		     value. Since we have two forms (read and update), we need ot make sure
		     only the selectors in the currently used form have ID */
			$scope.getCategoryId = function(category) {
				return $scope.enabled ? ("category-" + category.id) : null;
			};
		}
	};
})
