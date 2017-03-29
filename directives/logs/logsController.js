Dhis2Api.directive('logs', function() {
    return {
        restrict: 'E',
        scope: {accessor: "="},
        templateUrl: 'directives/logs/logsView.html',
        link: function(scope, element, attrs) {
            $.extend(scope.accessor, {
                initialized: true,
                toggleLogs: scope.toggleLogs,
                isVisible: scope.isVisible,
                addEntry: scope.addEntry
            });

            scope.init();
        },
        controller: function($scope, Logging) {
            $scope.equals = angular.equals;
            $scope.moment = moment;

            $scope.init = function() {
                // Max DbSize = EntrySize * maxBucketEntries * maxBuckets (entry size ~ 500 bytes)
                $scope.logs = {
                    logger: new Logging({maxBuckets: (1e9 / 500 / 100), maxBucketEntries: 100}),
                    entries: null,
                    visible: false,
                    offset: 0,
                    limitReached: false
                };
            }

            $scope.addEntry = function(entry) {
                $scope.logs.logger.addEntry(entry);
                $scope.logs.entries = [entry].concat($scope.logs.entries || []); 
            };

            $scope.isVisible = function() {
                return $scope.logs.visible; 
            }

            $scope.toggleLogs = function() {
                $scope.logs.visible = !$scope.logs.visible;
                if ($scope.logs.visible && !$scope.logs.entries) {
                    $scope.loadMoreLogs();
                }
            };

            $scope.loadMoreLogs = function() {
                $scope.logs.logger.getEntries($scope.logs.offset).then(function(newEntries) {
                    if (newEntries && newEntries.length > 0) {
                        $scope.logs.offset += 1;
                        $scope.logs.entries = ($scope.logs.entries || []).concat(newEntries);
                    } else {
                        $scope.logs.limitReached = true;
                    }
                });
            };

        }
    };
})
