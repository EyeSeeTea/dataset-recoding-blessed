/*
 * 
 * Core Module for using WebApi of dhis2
 * It is the persistence in the FrontEnd
 * 
 * */
var Dhis2Api = angular.module("Dhis2Api", ['ngResource']);

var urlBase = window.location.href.split('/api/apps/')[0];
var urlApi = urlBase + '/api/';


//Auxiliary variable to parse the url
var urlAuxLink = document.createElement('a');
urlAuxLink.href = urlBase;

//Delete initial and final slash
var auxBaseUrl = urlAuxLink.pathname;
if (auxBaseUrl.startsWith("/")) auxBaseUrl = auxBaseUrl.substring(1);
if (auxBaseUrl.endsWith("/")) auxBaseUrl = auxBaseUrl.substring(0, auxBaseUrl.length - 2);

//Dhis related variables
window.dhis2 = window.dhis2 || {};
dhis2.settings = dhis2.settings || {};
dhis2.settings.baseUrl = auxBaseUrl === "" ? "../.." : auxBaseUrl;


//var urlApi = "http://127.0.0.1:8080/api/";
//var urlBase = "http://127.0.0.1:8080/";

//Create all common variables of the apps 
Dhis2Api.factory("commonvariable", function() {
    var Vari = {
        url: urlApi,
        urlbase: urlBase,
        OrganisationUnitList: []
    };

    return Vari;
});

Dhis2Api.constant("urlApi", urlApi);


Dhis2Api.factory("Datasets", function($resource, commonvariable) {
    return $resource(commonvariable.url + "dataSets/:id.json", {},
        {
            query: {
                method: "GET",
                params: {
                    fields: "id,displayName,periodType,organisationUnits[id,displayName]"
                },
                isArray: true,
                transformResponse: function(data, headers) {
                    //return only datasets
                    if (!data) {
                        return [];
                    }
                    return JSON.parse(data).dataSets
                }
            }
        }
    );
});

Dhis2Api.factory("MetaData", function($resource) {
    return $resource("/dhis-web-dataentry/getMetaData.action", {},
        {
            query: {
                method: "GET",
                isArray: false,
                transformResponse: function(data, headers) {
                    return JSON.parse(data).metaData;
                }
            }
        }
    );
});

Dhis2Api.factory("MetaDataAssociations", function($resource) {
    return $resource("/dhis-web-dataentry/getDataSetAssociations.action", {},
        {
            query: {
                method: "GET",
                isArray: false,
                transformResponse: function(data, headers) {
                    return JSON.parse(data).dataSetAssociations;
                }
            }
        }
    );
});

Dhis2Api.factory('LoadForm', function($http) {
    return function(dataSetId) {
        return $http({
            method: 'GET',
            url: "/dhis-web-dataentry/loadForm.action",
            params: { dataSetId: dataSetId }
        });
    }
});

Dhis2Api.factory('LoadFormValues', function($http) {
    return function(de) {
        var params = {
            periodId: de.period.iso,
            dataSetId: de.dataset.id,
            organisationUnitId: de.organisationUnit.id,
            multiOrganisationUnit: false
        };
        var cc = de.categoryCombo;
        var cp = _(de.attributes).pluck("id").join(";");

        if (cc && cp) {
            params.cc = cc;
            params.cp = cp;
        }

        return $http({
            method: 'GET',
            url: "/dhis-web-dataentry/getDataValues.action",
            params: params
        });
    }
});

Dhis2Api.factory("DataValues", function($resource, commonvariable) {
    return $resource(commonvariable.url + "dataValues.json", {
        de:"@de",
        pe:"@pe",
        ou:"@ou",
        co:"@co",
        cc:"@cc",
        cp:"@cp"
    });
});


Dhis2Api.factory("CategoryCombos", function($resource, commonvariable) {
    return $resource(commonvariable.url + "categoryCombos/:id.json", {
        fields:"categoryOptionCombos[id,categoryOptions]"
    });
});

Dhis2Api.factory("DataValueSets", function($resource, commonvariable) {
    return $resource(commonvariable.url + "dataValueSets");
});

Dhis2Api.factory("DataStore", function($resource, urlApi) {
    var url = urlApi + "dataStore/dataset-recoding/:key";
    var resource = $resource(url, null, {
        update: {method: 'put'},
        create: {method: 'post'}
    });
    
    return {
        get: function(key, defaultValue) {
            return resource.get({key: key}).$promise
                .then(
                    function(res) { return res.toJSON(); },
                    function(err) { return err.status = 404 ? defaultValue : undefined; }
                );
        },
        
        save: function(key, data) {
            return resource.update({key: key}, data).$promise.catch(function(error) {
                if (error.status == 404) {
                    return resource.save({key: key}, data).$promise;
                } else {
                    throw new Error("Cannot save data store item: " + url + " - " + key);
                }
            });
        }
    };
});

Dhis2Api.factory('Logging', function($resource, DataStore) {
    return function(options = {}) {
        var maxBucketEntries = options.maxBucketEntries || 1e6;
        var maxBuckets = options.maxBuckets || 1e6;
        var logging = this;

        var getBucketKey = function(index) {
            return "logging-bucket-" + index.toString();
        };

        var getSafeBucketIndex = function(index, offset) {
            if (offset >= maxBuckets) {
                return null;
            } else {
                var max = maxBuckets;
                var bucketIndex = (((index - offset) % max) + max) % max;
                return "logging-bucket-" + bucketIndex.toString();
            }
        };

        var getCurrentIndex = function() {
            return DataStore.get("logging-state", {index: 0})
                .then(function(state) { return state.index; });
        };

        var setCurrentIndex = function(newIndex) {
            return DataStore.save("logging-state", {index: newIndex});
        };
            
        var getData = function() {
            return getCurrentIndex().then(function(index) {
                return DataStore.get(getBucketKey(index), {entries: []}).then(function(res) { 
                    return {index: index, entries: res.entries};
                }); 
            });
        };
        
        /* Public interface */

        this.getEntries = function(offset) {
            return getCurrentIndex().then(function(index) {
                var bucketKey = getSafeBucketIndex(index, offset);
                if (bucketKey) {
                    return DataStore.get(bucketKey, {entries: []}).then(function(r) { return r.entries; });
                } else {
                    return null;
                }
            });
        };

        this.addEntry = function(newEntry) {
            return getData().then(function(data) {
                var entries = data.entries;
                var index = data.index;
                var newEntries, newIndex;
                
                if (entries.length < maxBucketEntries) {
                    newIndex = index;
                    newEntries = [newEntry].concat(entries);
                } else {
                    newIndex = (index + 1) % maxBuckets;
                    newEntries = [newEntry];
                }
                return DataStore.save(getBucketKey(newIndex), {entries: newEntries}).then(function(res) { 
                    return newIndex != index ? setCurrentIndex(newIndex) : res; 
                });
            });
        };
    };
});
