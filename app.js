var dhisServerUtilsConfig = angular.module("dhisServerUtilsConfig", ['ngRoute', 'ngSanitize', 'Dhis2Api', 'pascalprecht.translate', 'ui.bootstrap', 'd2Menu']);

var configureDhis2Calendars = function(locale) {
    dhis2.period.format = "yyyy-mm-dd";
    dhis2.period.calendar = $.calendars.instance('gregorian', locale);
    dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );     
    dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );
    i18n_select_option = "";
};

dhisServerUtilsConfig.config(function($routeProvider) {
    $routeProvider.when('/DatasetRecoding', {
        templateUrl: "modules/datasetRecoding/datasetRecodingView.html",
        controller: "datasetRecodingController"
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
        configureDhis2Calendars(uiLocale);
        
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
