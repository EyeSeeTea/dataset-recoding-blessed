/* 
   Copyright (c) 2016.
 
   This file is part of DataSet Recoding.
 
   DataSet Recoding is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.
 
   Project Manager is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
 
   You should have received a copy of the GNU General Public License
   along with DataSet Recoding.  If not, see <http://www.gnu.org/licenses/>. */

dhisServerUtilsConfig.controller('datasetRecodingController', function($rootScope, $scope, $filter, $q, Datasets, MetaData, MetaDataAssociations, LoadForm, LoadFormValues, DataValues, CategoryCombos, DataValueSets) {

    var $translate = $filter('translate');
    var $orderBy = $filter('orderBy');

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
     * A category (attribute) has been selected
     */
    $scope.categorySelected = function() {
        //Check if every attribute has been selected
        $scope.isInputSelected();
        //Reload categoryComboOptions ids array
        $scope.targetAttributeParams = loadTargetAttributeParams();
    };

    /**
     * Datavalues are ready to be move when:
     *  - data is loaded
     *  - Every input has been selected
     *  - There is no blank category
     */
    $scope.readyToMove = function() {
        return $scope.dataLoaded && $scope.isInputSelected() && $scope.targetAttributeParams !== null;
    };

    /**
     * Cancel current selection 
     */
    $scope.cancel = function() {
        init();
    };

    /**
     * Closes alert row
     */
    $scope.closeAlert = function() {
        $scope.showFeedback = false;
    };

    /**
     * Load formdata 
     */
    $scope.loadForm = function() {
        $scope.loading = true;
        $scope.dataLoaded = false;
        $scope.currentFormData = "";
        $scope.currentForm = "";

        //Reset originalParams
        $scope.originalParams = saveCurrentParams();
        $scope.originalAttributes = $scope.targetAttributeParams;
        
        //Load form structure
        LoadForm($scope.dataset.id)
            .success(function(data) {
                $scope.currentForm = data;
                $rootScope.$broadcast('formLoaded');
            });
    };
    
    /**
     * Decrease year offset
     */
    $scope.prevYear =  function() {
    	dhis2.de.currentPeriodOffset--;    	
    	populatePeriods();
    }

    /**
     * Increase year offset
     */
    $scope.nextYear =  function() {
    	dhis2.de.currentPeriodOffset++;
    	populatePeriods();
    }
    
    
    /**
     * Move form data into new selection (organisationUnit, period, attributes combination)
     */
    $scope.moveFormData = function() {

        //Show spinner while moving data
        $scope.loading = true;
        $scope.dataLoaded = false;

        //Save destination params
        $scope.targetParams = saveCurrentParams();

        //Remove data values from previous dataset combination
        removeDataValues();

        //Find categoryComboOption uid & post new datavalues
        findCategoryComboOption();
    };

    /**
     * Inits model
     */
    var init = function() {
        $scope.loading = false;
        $scope.datasets = [];
        $scope.dataset = null;
        clearSelection();
        loadDhisData();
        populateDataSets();
    };

    /**
     * Clears model stuff
     */
    var clearSelection = function() {
        $scope.periods = [];
        $scope.organisationUnits = [];
        $scope.currentCategories = [];
        $scope.currentForm = null;
        $scope.dataLoaded = false;
        $scope.originalParams = {};
        $scope.showFeedback = false;
        $scope.targetAttributeParams = [];

        dhis2.de.currentDataSetId = null;
        dhis2.de.currentOrganisationUnitId = null;
        dhis2.de.currentCategories = [];
    }

    /**
     * Loads metadata into dhis2 global var
     */
    var loadMetaData = function(metaData) {
        dhis2.de.emptyOrganisationUnits = metaData.emptyOrganisationUnits;
        dhis2.de.significantZeros = metaData.significantZeros;
        dhis2.de.dataElements = metaData.dataElements;
        dhis2.de.indicatorFormulas = metaData.indicatorFormulas;
        dhis2.de.dataSets = metaData.dataSets;
        dhis2.de.optionSets = metaData.optionSets;
        dhis2.de.defaultCategoryCombo = metaData.defaultCategoryCombo;
        dhis2.de.categoryCombos = metaData.categoryCombos;
        dhis2.de.categories = metaData.categories;
    };

    /**
     * Loads metadataAssociations into dhis2 global var
     */
    var loadMetaDataAssociations = function(metaDataAssociations) {
        dhis2.de.dataSetAssociationSets = metaDataAssociations.dataSetAssociationSets;
        dhis2.de.organisationUnitAssociationSetMap = metaDataAssociations.organisationUnitAssociationSetMap;
    };

    /**
     * Triggers metadata
     */
    var loadDhisData = function() {
        $q.all([MetaData.query().$promise, MetaDataAssociations.query().$promise])
            .then(function(result) {
                //Require to insert select values into forms
                DAO.store.open();

                //Load metadata info
                loadMetaData(result[0]);
                loadMetaDataAssociations(result[1]);
            });
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
        var periods = dhis2.period.generator.generateReversedPeriods($scope.dataset.periodType, dhis2.de.currentPeriodOffset);
        periods = dhis2.period.generator.filterOpenPeriods($scope.dataset.periodType, periods, 0);
        $scope.periods = periods;
    }

    /**
     * Populate organisationUnits according to dataset
     */
    var populateOrgUnits = function() {
        $scope.organisationUnits = $orderBy($scope.dataset.organisationUnits, function(organisationUnit) {
            return organisationUnit.displayName.trim();
        });
    }

    /**
     * Populate attributes according to dataset 
     */
    var populateAttributes = function() {
        dhis2.de.currentCategories = dhis2.de.getCategories(dhis2.de.currentDataSetId);
        $scope.currentCategories = dhis2.de.currentCategories;
    };

    /**
     * Save current selection config
     */
    var saveCurrentParams = function() {
        var params = {
            datasetId: $scope.dataset.id,
            periodId: $scope.period.iso,
            organisationUnitId: $scope.organisationUnit.id,
            categoryCombo: dhis2.de.dataSets[$scope.dataset.id].categoryCombo
        };

        return params;
    };


    /**
     * Load datavalues into table
     */
    var formLoaded = function() {
        LoadFormValues($scope.dataset.id, $scope.period.iso, $scope.organisationUnit.id).success(function(data) {
            $scope.loading = false;
            $scope.currentFormData = data;
            $scope.dataLoaded = true;

            //Enable selects and tabs
            dhis2.de.insertOptionSets();
            if (dhis2.de.dataSets[$scope.dataset.id].renderAsTabs) {
                $("#tabs").tabs();
            }
            
            //dataentry: form.js
            insertDataValues(data);
            
            //Beatify form
            beautifyForm();
        });
    };

    /**
     * Beautifies l&f of the form:
     *  -Readonly inputs
     *  -Bootstrap look
     */
    var beautifyForm = function() {
        $(".entryoptionset").select2("enable", false);
        $('.entryfield').attr('readonly', 'readonly');
        $(".entrytrueonly").attr("disabled", true);
        $('table').addClass("table table-striped");
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

    /**
     * Removes current dataValues from the dataset
     */
    var removeDataValues = function() {
        //Precondition
        if (!$scope.currentFormData || !$scope.currentFormData.dataValues) {
            return;
        }

        //Delete each datavalue 
        angular.forEach($scope.currentFormData.dataValues, function(value) {
            var dataValueTokens = value.id.split("-");
            var dataElementId = dataValueTokens[0];
            var categoryOptionCombo = dataValueTokens[1];
            DataValues.delete({
                de: dataElementId,
                pe: $scope.originalParams.periodId,
                ou: $scope.originalParams.organisationUnitId,
                co: categoryOptionCombo,
                cc: $scope.originalParams.categoryCombo,
                cp: $scope.originalAttributes.join(";")
            });
        });
    };

    /**
     * Resolves current attributes combination from CategoryCombos endpoint
     */
    var findCategoryComboOption = function() {
        //Load target combination
        var categoryCombo = $scope.targetParams.categoryCombo;
        CategoryCombos.get({ id: categoryCombo }, function(data) {
            var categoryOptionCombos = data.categoryOptionCombos;
            var categoryOptionComboId = null;
            //No attributes -> default combination
            if (!$scope.targetAttributeParams || $scope.targetAttributeParams.length == 0) {
                categoryOptionComboId = categoryOptionCombos[0].id;
            } else {
                categoryOptionComboId = findCategoryOptionComboId($scope.targetAttributeParams, categoryOptionCombos);
            }

            //Found -> send event (now we're ready to post new values)
            $rootScope.$broadcast('categoryOptionComboFound', categoryOptionComboId);
        });
    };

    /**
     *  On new categoryOptionCombo found -> post new values 
     */
    var categoryOptionComboFound = function(event, categoryOptionComboId) {
        var dataValues = buildDataValues();
        var dataValueSet = new DataValueSets(
            {
                "dataSet": $scope.targetParams.datasetId,
                "period": $scope.targetParams.periodId,
                "orgUnit": $scope.targetParams.organisationUnitId,
                "attributeOptionCombo": categoryOptionComboId,
                "dataValues": dataValues
            }
        );

        dataValueSet.$save(function() {
            $scope.showFeedback = true;
            $scope.loading = false;
            $scope.dataLoaded = false;
        });
    };

    /**
     * Builds an array of datavalues to post into a new dataset 
     */
    var buildDataValues = function() {
        //Precondition
        if (!$scope.currentFormData || !$scope.currentFormData.dataValues) {
            return [];
        }

        //Delete each datavalue 
        var dataValues = [];
        angular.forEach($scope.currentFormData.dataValues, function(value) {
            var dataValueTokens = value.id.split("-");
            var dataElementId = dataValueTokens[0];
            var categoryOptionCombo = dataValueTokens[1];

            this.push(
                { "dataElement": dataElementId, "categoryOptionCombo": categoryOptionCombo, "value": value.val }
            );
        }, dataValues);

        return dataValues;
    }


    /**
     * Finds the categoryOptionCombo ID for the current combination to attributes
     */
    var findCategoryOptionComboId = function(currentAttributes, categoryOptionCombos) {

        var attributesNeeded = currentAttributes.length;
        //Loop over each combo
        for (var i = 0; i < categoryOptionCombos.length; i++) {
            var categoryOptionCombo = categoryOptionCombos[i];

            //Every attribute must be contained in this combo
            var attributesFound = 0;
            for (var j = 0; j < categoryOptionCombo.categoryOptions.length; j++) {
                //Look for combo option into attribute values
                var categoryOption = categoryOptionCombo.categoryOptions[j];
                for (var k = 0; k < currentAttributes.length; k++) {
                    if (currentAttributes[k] === categoryOption.id) {
                        attributesFound++;
                    }
                }
            }

            if (attributesFound === attributesNeeded) {
                return categoryOptionCombo.id;
            }
        }
        return null;
    };

    //Set event listeners
    $rootScope.$on('formLoaded', formLoaded);
    $rootScope.$on('categoryOptionComboFound', categoryOptionComboFound);

    //Init model
    init();
});
