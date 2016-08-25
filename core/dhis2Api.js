/*
 * 
 * Core Module for using WebApi of dhis2
 * It is the persistence in the FrontEnd
 * 
 * */
var Dhis2Api = angular.module("Dhis2Api", ['ngResource']);

var urlApi = "http://127.0.0.1:8080/api/";
var urlBase = "http://127.0.0.1:8080/";

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

Dhis2Api.factory("Datasets",function($resource) {
    return $resource("/api/24/dataSets/:id.json",{},
        {
            query: {
                method:"GET",
                params:{
                    fields:"id,displayName,periodType,organisationUnits[id,displayName]"
                },
                isArray:true,
                transformResponse: function (data, headers) {                
                    //return only datasets
                    if(!data){
                        return [];
                    }
                    return JSON.parse(data).dataSets
                }        
            }
        }
    );
});

