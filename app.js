var dhisServerUtilsConfig = angular.module("dhisServerUtilsConfig", ['ngRoute', 'ngSanitize', 'Dhis2Api', 'pascalprecht.translate', 'ui.bootstrap', 'd2Menu']);

dhisServerUtilsConfig.config(function($routeProvider, urlApi) {
    $routeProvider.when('/DatasetRecoding', {
        templateUrl: "modules/datasetRecoding/datasetRecodingView.html",
        controller: "datasetRecodingController",
        resolve: {
            userInfo: function() { 
                return $.get(urlApi + "me")
                    .fail(function() { alert("Cannot load user info"); }); 
            }
        }
    });
    $routeProvider.otherwise({
        redirectTo: '/DatasetRecoding'
    });

});

dhisServerUtilsConfig.config(function($translateProvider, urlApi) {

    $translateProvider.useStaticFilesLoader({
        prefix: 'languages/',
        suffix: '.json'
    });

    $translateProvider.registerAvailableLanguageKeys(
        ['en', 'es', 'fr', 'ar'],
        {
            'en*': 'en',
            'es*': 'es',
            'fr*': 'fr',
            'ar*': 'ar',
            '*': 'en' // must be last!
        }
    );

    $translateProvider.fallbackLanguage(['en']);

    jQuery.ajax({ url: urlApi + 'userSettings/keyUiLocale/', contentType: 'text/plain', method: 'GET', dataType: 'text', async: false }).success(function(uiLocale) {
        if (uiLocale == '') {
            $translateProvider.determinePreferredLanguage();
        }
        else {
            $translateProvider.use(uiLocale);
        }
    }).fail(function() {
        $translateProvider.determinePreferredLanguage();
    });

});

//Filter to sanitize html without removing inputs
dhisServerUtilsConfig.filter('html', ['$sce', function($sce) {
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);
