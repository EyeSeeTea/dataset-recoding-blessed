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
dhis2.settings.baseUrl = auxBaseUrl;


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

Dhis2Api.factory("userAuthorization", ['$resource', 'commonvariable', function($resource, commonvariable) {
    return $resource(commonvariable.url + "me/authorization/:menuoption",
        {
            menuoption: '@menuoption'
        },
        { get: { method: "GET", transformResponse: function(response) { return { status: response }; } } });

}]);

Dhis2Api.factory("TreeOrganisationunit", ['$resource', 'commonvariable', function($resource, commonvariable) {
    return $resource(commonvariable.url + "organisationUnits/:uid",
        {
            uid: '@uid',
            fields: 'name,id,level,children[name,id,level]'
        },
        { get: { method: "GET" } });
}]);

Dhis2Api.factory("ProgramsList", ['$resource', 'commonvariable', function($resource, commonvariable) {
    return $resource(commonvariable.url + "programs.json",
        {},
        { get: { method: "GET" } });
}]);

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
    return function(dataSetId, periodId, organisationUnitId) {
        var params = {
            periodId: periodId,
            dataSetId: dataSetId,
            organisationUnitId: organisationUnitId,
            multiOrganisationUnit: false
        };
        var cc = dhis2.de.getCurrentCategoryCombo();
        var cp = dhis2.de.getCurrentCategoryOptionsQueryValue();

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
        co:"@co"
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




