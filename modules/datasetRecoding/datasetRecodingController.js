/* 
   Copyright (c) 2016.
 
   This file is part of Project Manager.
 
   Project Manager is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.
 
   Project Manager is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
 
   You should have received a copy of the GNU General Public License
   along with Project Manager.  If not, see <http://www.gnu.org/licenses/>. */

dhisServerUtilsConfig.controller('datasetRecodingController', function($scope, $filter, commonvariable, $timeout, ProgramsList, Datasets) {

    var $translate = $filter('translate');
    var $orderBy = $filter('orderBy');

    //Init stuff
    var init = function() {
        $scope.datasets = [];
        populateDataSets();
    };

    //Populate datasets
    var populateDataSets = function() {
        $scope.datasets = Datasets.query();
    };

    //Populate periods according to dataset
    var populatePeriods = function() {
        var periods = dhis2.period.generator.generateReversedPeriods($scope.dataset.periodType, 0);
        periods = dhis2.period.generator.filterOpenPeriods($scope.dataset.periodType, periods, 0);
        $scope.periods = periods;
    }
    
    //Populate organisationUnits according to dataset
    var populateOrgUnits = function(){
        $scope.organisationUnits=$orderBy($scope.dataset.organisationUnits, function(organisationUnit){
            return organisationUnit.displayName.trim();
        });
    }

    //DataSet selected
    $scope.datasetSelected = function() {
        //No dataset selected -> reset
        if (!$scope.dataset) {
            $scope.periods = [];
            $scope.organisationUnits = [];
        }

        //Populate periods
        populatePeriods();
        
        //Populate orgunits
        populateOrgUnits();
    };

    $scope.cancel = function() {
        $scope.dataset = null;
        $scope.period = null;
        $scope.periods = [];
    };

    init();

    // $scope.openstart = function($event) {
    //     $event.preventDefault();
    //     $event.stopPropagation();

    //     $scope.openedstart = true;
    // };

    // $scope.openend = function($event) {
    //     $event.preventDefault();
    //     $event.stopPropagation();

    //     $scope.openedend = true;
    // };

    // $scope.submit = function() {

    //     $scope.progressbarDisplayed = true;


    //     var fecha_inicio = $filter('date')($scope.start_date, 'yyyy-MM-dd');
    //     var fecha_fin = $filter('date')($scope.end_date, 'yyyy-MM-dd');

    //     var result = ProgramsList.get();



    //     //include current date in the file name, Helder
    //     var today = new Date();
    //     var dd = (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
    //     var mm = (today.getMonth() < 9 ? '0' + (today.getMonth() + 1) : today.getMonth());
    //     var yyyy = today.getFullYear();

    //     //////
    //     var fileName = $scope.file_name + "_" + yyyy + mm + dd;

    //     var orgUnits_filter = "";

    //     result.$promise.then(function(data) {
    //         console.log('kk');
    //         console.log(data);
    //         console.log(data.programs);

    //     });

    //     $scope.progressbarDisplayed = false;
    // }



});
