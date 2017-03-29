dhisServerUtilsConfig.controller('datasetRecodingController', function($rootScope, 
        $scope, $filter, $translate, $q, Datasets, MetaData, 
        MetaDataAssociations, LoadForm, LoadFormValues, DataValues, 
        CategoryCombos, DataValueSets, userInfo, Logging) {
    var STATES = {read: "read", update: "update"};

    var translate = $filter('translate');
    var $orderBy = $filter('orderBy');

    /* Accessors for children directives */
     
    $scope.formRead = {}; 
    $scope.formUpdate = {};
    $scope.logs = {};

    /**
     * Datavalues are ready to be move when:
     *  - data is loaded
     *  - Every input has been selected
     *  - There is no blank category
     */
    $scope.readyToMove = function() {
        return $scope.dataLoaded && 
               $scope.formUpdate.isInputSelected() && 
               $scope.currentForm;
    };

    /**
     * Cancel current selection 
     */
    $scope.cancel = function() {
        $scope.formRead.clear();
        clearSelection();
    };
    
    $scope.cancelUpdate = function() {
        $scope.state = STATES.read;
    }
    
    /**
     * Closes alert row
     */
    $scope.closeAlert = function() {
        $scope.showFeedback = false;
    };
    
    $scope.selectorsMatchFormData = function() {
        return (
            $scope.formRead.initialized &&
            $scope.formRead.isInputSelected() &&
            $scope.currentFormParams && 
            _.isEqual($scope.formRead.getDataElement(), $scope.currentFormParams)
        );
    };

    /**
     * Load formdata 
     */
    $scope.loadForm = function() {
        $scope.loading = true;
        $scope.showFeedback = false;
        $scope.dataLoaded = false;
        $scope.currentFormParams = null;
        $scope.currentFormData = "";
        $scope.currentForm = "";
        
        var de = $scope.formRead.getDataElement();

        //Load form structure
        LoadForm(de.dataset.id)
            .success(function(data) {
                $scope.currentForm = data;
                $rootScope.$broadcast('formLoaded');
            });
    };

    $scope.areSourceTargetParamsEqual = function() {
        var targetParams = $scope.formUpdate.getDataElement();
        return _.isEqual(targetParams, $scope.currentFormParams);
    }
    
    /**
     * Move form data into new selection (organisationUnit, period, attributes combination)
     */
    $scope.moveFormData = function() {
        if ($scope.areSourceTargetParamsEqual()) {
            alert(translate("SAME_DATA"));
            return;
        }
        
        var targetParams = $scope.formUpdate.getDataElement();
        LoadFormValues(targetParams).success(function(data) {
            if (_.isEmpty(data.dataValues) || confirm(translate("EXISTING_DATA"))) {
                //Show spinner while moving data
                $scope.loading = true;

                //Find categoryComboOption uid & post new datavalues
                findCategoryComboOption();
            }
        });
    };

    /**
     * Inits model
     */
    var init = function() {
        $scope.loading = false;
        loadDhisData();
        clearSelection();
        $scope.state = STATES.read;
        $scope.updateErrors = null;
    };

    $scope.updateFormVisible = function() {
        return $scope.state === STATES.update;
    };
    
    $scope.startRecode = function() {
        $scope.state = STATES.update;
        $scope.formUpdate.setDataElement($scope.currentFormParams);
    }
    
    /**
     * Clears model stuff
     */
    var clearSelection = function() {
        $scope.currentForm = null;
        $scope.currentFormParams = null;
        $scope.dataLoaded = false;
        $scope.showFeedback = false;
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
     * Load datavalues into table
     */
    var formLoaded = function() {
        var de = $scope.formRead.getDataElement();
        
        LoadFormValues(de).success(function(data) {
            $scope.loading = false;
            $scope.currentFormData = data;
            // _.clone performs a shadow clone, clone attributes explicitly
            $scope.currentFormParams = _.extend(_.clone(de), {attributes: _.clone(de.attributes)});
            $scope.dataLoaded = true;

            //Enable selects and tabs
            dhis2.de.insertOptionSets();
            if (dhis2.de.dataSets[de.dataset.id].renderAsTabs) {
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
            var de = $scope.currentFormParams;
            var datavalue = {
                de: dataElementId,
                pe: de.period.iso,
                ou: de.organisationUnit.id,
                co: categoryOptionCombo,
                cc: de.attributes.length > 0 ? de.categoryCombo : null,
                cp: _(de.attributes).pluck("id").join(";")
            }
            DataValues.delete(_.pick(datavalue, _.identity));
        });
    };

    /**
     * Resolves current attributes combination from CategoryCombos endpoint
     */
    var findCategoryComboOption = function() {
        //Load target combination
        var targetParams = $scope.formUpdate.getDataElement();
        var categoryCombo = targetParams.categoryCombo;
        CategoryCombos.get({ id: categoryCombo }, function(data) {
            var categoryOptionCombos = data.categoryOptionCombos;
            var categoryOptionComboId = null;
            //No attributes -> default combination
            if (!targetParams.attributes || targetParams.attributes.length == 0) {
                categoryOptionComboId = categoryOptionCombos[0].id;
            } else {
                categoryOptionComboId = findCategoryOptionComboId(
                    _(targetParams.attributes).pluck("id"), 
                    categoryOptionCombos);
            }

            //Found -> send event (now we're ready to post new values)
            $rootScope.$broadcast('categoryOptionComboFound', categoryOptionComboId);
        });
    };
    
    var buildLoggingEntry = function(sourceDataElement, targetDataElement) {
        var buildDataElement = function(de) {
	        var attributes = _
	            .chain(de.categories)
	            .zip(de.attributes)
	            .map(function(pair) {
	                return {
	                    category: _(pair[0]).pick("name", "id"),
	                    attribute: _(pair[1]).pick("name", "id")
	                 };
	            });

            return {
                dataset: _(de.dataset).pick("displayName", "id"),
                organisationUnit: de.organisationUnit,
                period: {displayName: de.period.name, code: de.period.iso},
                attributes: attributes.value()
            };
        };

        return {
            date: new Date(),
            user: {
                displayName: userInfo.displayName, 
                username: userInfo.userCredentials.username
            },
            source: buildDataElement(sourceDataElement),
            target: buildDataElement(targetDataElement)
        };
    }

    /**
     *  On new categoryOptionCombo found -> post new values 
     */
    var categoryOptionComboFound = function(event, categoryOptionComboId) {
        var dataValues = buildDataValues();
        var targetParams = $scope.formUpdate.getDataElement();
        var dataValueSet = new DataValueSets(
            {
                "dataSet": targetParams.dataset.id,
                "period": targetParams.period.iso,
                "orgUnit": targetParams.organisationUnit.id,
                "attributeOptionCombo": categoryOptionComboId,
                "dataValues": dataValues
            }
        );

        dataValueSet.$save(function(res) {
            if (res.status === "SUCCESS" && _.isEmpty(res.conflicts)) {
                removeDataValues();
                var entry = buildLoggingEntry($scope.currentFormParams, targetParams);
                $scope.logs.addEntry(entry);
                $scope.showFeedback = true;
                $scope.dataLoaded = false;
                $scope.loading = false;
                $scope.currentForm = null;
                $scope.currentFormParams = null;
                $scope.dataLoaded = false;
                $scope.state = STATES.read;
                $scope.updateErrors = null;
            } else {
                var conflicts = _(res.conflicts).map(function(conflict) { 
                    return "[" + conflict.object + "] "  + conflict.value; 
                });
                $scope.updateErrors = conflicts;
                $scope.loading = false;
            }
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

    var configureDhis2Calendars = function(locale) {
        dhis2.period.format = "yyyy-mm-dd";
        dhis2.period.calendar = $.calendars.instance('gregorian', locale);
        dhis2.period.generator = 
            new dhis2.period.PeriodGenerator(dhis2.period.calendar, dhis2.period.format);     
        dhis2.period.picker = 
            new dhis2.period.DatePicker(dhis2.period.calendar, dhis2.period.format);
        i18n_select_option = "";
    };
    
    //Set event listeners
    $rootScope.$on('formLoaded', formLoaded);
    $rootScope.$on('categoryOptionComboFound', categoryOptionComboFound);

    configureDhis2Calendars($translate.use());
    
    //Init model
    init();
});
