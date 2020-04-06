(function () {
    'use strict';

    angular.module('app', [
        // Core modules
         'app.core'
        // Custom Feature modules
        ,'app.i18n'
        ,'app.layout'
        ,'app.home'
        ,'app.login'
        ,'app.ticket'
        ,'app.booking'
    ]);

})();

(function() {
    'use strict';
    angular
        .module('app.booking', []);
})();

(function() {
    'use strict';

    angular
        .module('app.home', []);
})();

(function () {
    'use strict';

    angular.module('app.core', [
        // Angular modules
         'ngAnimate'
        ,'ngAria'
        ,'ngMessages'

        // 3rd Party Modules
        ,'oc.lazyLoad'
        ,'ngMaterial'
        ,'ui.router'
        ,'duScroll'
        ,'ui-notification'
    ]);

})();

(function() {
    'use strict';

    angular
        .module('app.login', []);
})();

(function () {
    'use strict';

    angular.module('app.layout', []);

})(); 
(function() {
    'use strict';

    angular
        .module('app.ticket', []);
})();

(function() {
    'use strict';

    angular
        .module('app.booking')
        .controller('BookingController', BookingController);

    BookingController.$inject = ['$location', 'TicketService', 'BookingService', 'Notification', '$rootScope'];

    /* @ngInject */
    function BookingController($location, TicketService, BookingService, Notification, $rootScope) {
        var vm = this;
        vm.listDays = [];
        vm.listRanges = [];
        vm.selectTime = 0;
        vm.selectDay = 0;

        vm.$onInit = function() {
            loadListTimes();
        };

        var convertDate = function(fecha) {
          var daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          var monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          var date = new Date(fecha);
          return daysNames[date.getDay()]+', '+date.getDate()+' de '+monthNames[date.getMonth()]+' del '+date.getFullYear();
        };

        var getListDays = function(){
          vm.listDays = [];
          if(vm.listTimes !== null && vm.listTimes.length > 0){
            for (var i = 0; i < vm.listTimes.length; i++) {
              var ranges = [];
              for(var j= 0; j < vm.listTimes[i].ranges.length; j++){
                ranges[j] = {
                  start_time: vm.listTimes[i].ranges[j].start_time,
                  end_time: vm.listTimes[i].ranges[j].end_time,
                  hours: 'Desde ' + getHora(vm.listTimes[i].ranges[j].start_time)+ ' Hasta ' +getHora(vm.listTimes[i].ranges[j].end_time)
                };
              }
              vm.listDays[i] = {
                value: convertDate(vm.listTimes[i].day).toLowerCase(),
                display: convertDate(vm.listTimes[i].day),
                ranges: ranges
              };
            }
          } else{
            Notification.clearAll();
            Notification.error('No existen horarios disponibles para esta agencia.');
          }
        };

        var loadListTimes = function() {
            $rootScope.$broadcast('preloader:active');
            vm.listTimes = [];
            var branch = JSON.parse(localStorage.getItem('branchData'));
            var branch_id = branch.id;
            var service_id = localStorage.getItem('serviceId');
            vm.listTimes = BookingService.getDayBooking(branch_id, service_id);
            $rootScope.$broadcast('preloader:hide');
            getListDays();
        };

        vm.selectedItemChange = function() {
          console.log(vm.selectDay);
          vm.listRanges = [];
          vm.selectTime = 0;

          for (var i = 0; i < vm.listDays.length; i++) {
            if(vm.listDays[i].value === vm.selectDay){
              for (var j = 0; j < vm.listDays[i].ranges.length; j++) {
                vm.listRanges[j] = {
                  value:vm.listDays[i].ranges[j].start_time + '*' +vm.listDays[i].ranges[j].end_time,
                  display:vm.listDays[i].ranges[j].hours
                };
              }
              break;
            }
          }
        };

        vm.save = function() {
          if(vm.selectDay !== 0 && vm.selectTime !== 0){
            $rootScope.$broadcast('preloader:active');
            var branch = JSON.parse(localStorage.getItem('branchData'));
            var login = JSON.parse(localStorage.getItem('loginData'));
            var channel_id = TicketService.getChannel();
            var bookingJSON = {
              'channel_id': channel_id,
              'branch_id': branch.id,
              'service_id': localStorage.getItem('serviceId'),
              'customer_id': login.customer_id,
              'doc_type': login.typeDocument.id + '',
              'doc_number': login.document,
			  'email':login.email,
			  'username':login.username,
              'phone':  login.code + login.cellphone,
              'start_time': vm.selectTime.split('*')[0],
              'end_time': vm.selectTime.split('*')[1]
            };

            BookingService.generateBooking(bookingJSON)
            .then(function(response) {
               BookingService.sendEmail(bookingJSON)
				.then(function(response) {
				  $rootScope.$broadcast('preloader:hide');
				  $location.url('/bookings');
				}, function(error) {
				  console.log(error);
				  
				});
            }, function(error) {
              console.log(error);
              $rootScope.$broadcast('preloader:hide');
              Notification.clearAll();
                if(error.data.type === 'CustomerBookingRestrictionException'){
                  Notification.warning('No puede generar otra reserva para el mismo servicio.');
                } else{
                  Notification.error('Error al generar la reserva.');
                }
            });
			
          }  
        };
    }
})();

(function () {
    'use strict';

    angular
        .module('app.booking')
        .service('BookingService', BookingService);

    BookingService.$inject = ['$http', 'appConfig'];

    /* @ngInject */
    function BookingService($http, appConfig) {

        var intervalBooking = null;

        this.addIntervalBooking = function (newIntervalBooking) {
            if (intervalBooking != null) {
                clearInterval(intervalBooking);
            }
            intervalBooking = newIntervalBooking;
        };

        this.getBookings = function (customer_id, fields) {
            fields = (fields !== null && fields !== "") ? fields : '';
            return $http({
                url: appConfig.main.host + '/bookings/',
                method: 'GET',
                data: null,
                params: {
                    customer_id: customer_id
                }
            }).then(function (response) {
                return response.data;
            }, function (error) {
                throw error;
            });
        };

        this.getBooking = function (booking_id) {
            return $http({
                "method": "get",
                "url": appConfig.main.host + '/bookings/' + booking_id,
                "headers": {
                    "accept": "application/json",
                    "content-type": "text/plain"
                },
                "data": null,
                "params": {}
            })
                .then(
                    function (response) {
                        return response.data;
                    },
                    function (error) {
                        throw error;
                    }
                );
        };

        this.generateBooking = function (bookingJSON) {
            return $http({
                method: "POST",
                url: appConfig.main.host + '/bookings/',
                headers: {
                    "accept": "application/json",
                    "content-type": "application/json"
                },
                data: bookingJSON,
                params: {}
            })
                .then(
                    function (response) {
                        return response.data;
                    },
                    function (error) {
                        throw error;
                    }
                );
        };
		
		   this.sendEmail = function (bookingJSON) {
            return $http({
                method: "POST",
                url: 'https://sptc.mtc.gob.pe/CitasOnline/api/email/Send',
                headers: {
                    "accept": "application/json",
                    "content-type": "application/json"
                },
                data: bookingJSON,
                params: {}
            })
                .then(
                    function (response) {
                        return response.data;
                    },
                    function (error) {
                        throw error;
                    }
                );
        };

        this.getBranchs = function (customer_id, fields) {
            fields = (fields !== null && fields !== "") ? fields : '';
            return $http({
                url: appConfig.main.host + '/branches/',
                method: 'GET',
                data: {},
                params: {
                    customer_id: customer_id,
                    "limit": 10
                }
            }).then(
                function (response) {
                    return (response.data);
                },
                function (error) {
                    throw error;
                });
        };

        this.getDayBooking = function (branch_id, service_id) {
            var daysAllowed = [];
            $.ajax({
                async: false,
                type: 'GET',
                url: appConfig.main.host + "/bookings/days",
                data: {
                    "branch_id": branch_id,
                    "service_id": service_id,
                    "limit": 10
                },
                success: function (data) {
                    var now = new Date();
                    var today = new Date();
                    today.setHours(0, 0, 0, 0);

                    data.forEach(day => {
                        let cleanDay = new Date(day.day);
                        cleanDay.setHours(0, 0, 0, 0);
                        if (cleanDay.getTime() == today.getTime()) {
                            var newRanges = day.ranges.filter(
                                (range) => {
                                    let start_time = new Date(range.start_time);
                                    let end_time = new Date(range.end_time);
                                    return ((now >= start_time && now < end_time) || now < start_time);
                                }
                            );
                            day.ranges = newRanges;
                            daysAllowed.push(day);
                        } else {
                            daysAllowed.push(day);
                        }
                    });
                },
                error: function (error) {
                    throw error;
                }
            });

            return daysAllowed;
        };

        this.deleteBooking = function (booking) {
            return $http.delete(appConfig.main.host + "/bookings/" + booking.id)
                .then(
                    function (response) {
                        return response;
                    },
                    function (error) {
                        throw error;
                    }
                );
        };
    }
})();

(function () {
    'use strict';

    angular
        .module('app.booking')
        .controller('BookingsController', BookingsController);

    BookingsController.$inject = ['$location', '$mdDialog', 'BookingService', 'TicketService', 'MainService', 'Notification', '$rootScope'];

    /* @ngInject */
    function BookingsController($location, $mdDialog, BookingService, TicketService, MainService, Notification, $rootScope) {
        var vm = this;
        vm.listBranchs = null;

        vm.$onInit = function () {
            calcularScreen();
            getListBranchs();
        };

        let interval = setInterval(intervalBooking, 5000);
        BookingService.addIntervalBooking(interval);

        function intervalBooking() {

            if (vm.listBranchs != null) {
                const day = new Date();
                vm.listBranchs.forEach(booking => {

                    const start = new Date(booking.start_time);
                    const end = new Date(booking.end_time)

                    if (day >= start && day <= end
                        && booking.status == 'INACTIVE') {
                        getListBranchs();
                    }

                    if (day > end && booking.status == 'ACTIVE') {
                        getListBranchs();
                    }
                });
            }
        }

        vm.generateTicket = function (booking) {
            var branch;
            var login = JSON.parse(localStorage.getItem('loginData'));

            TicketService.getBranch(booking.branch.id).then(
                function (data) {
                    branch = data;
                    var inputTicket = {
                        'channel_id': booking.channel.id,
                        'branch_id': booking.branch.id,
                        'sector_id': branch.sectors[0].id,
                        'service_id': booking.service.id,
                        'status': 'ENABLED',
                        'customer_id': login.customer_id,
                        'doc_type': login.typeDocument.id + "",
                        'doc_number': login.document,
                        'phone': login.code + login.cellphone,
                    };

                    $rootScope.$broadcast('preloader:active');

                    TicketService.generateTicket(inputTicket)
                        .then(
                            function (data) {
                                $rootScope.$broadcast('preloader:hide');
                                localStorage.setItem('ticketData', JSON.stringify(data));
                                $location.url('/ticketsummary');
                            },
                            function (error) {
                                console.log(error);
                                $rootScope.$broadcast('preloader:hide');
                                Notification.clearAll();
                                if (error.data.type === "CustomerTicketRestrictionException") {
                                    Notification.warning('No puede generar otro ticket para el mismo servicio.');
                                }
                                else if (error.data.type === "SectorNotAvailableException") {
                                    Notification.error('No hay ventanillas de atención disponibles');
                                }
                                else {
                                    Notification.error('Error al generar ticket!');
                                }
                            }
                        );
                },
                function (error) {
                    console.log(error);
                    Notification.clearAll();
                    Notification.error('Error al generar ticket!');
                }
            );
        }

        var getListBranchs = function () {
            $rootScope.$broadcast('preloader:active');
            var customer_id = JSON.parse(localStorage.getItem('loginData')).customer_id;
            var fields = "";
            BookingService.getBookings(customer_id, fields).then(
                function (data) {
                    $rootScope.$broadcast('preloader:hide');
                    if (data.length > 0) {
                        vm.listBranchs = data;
                    } else {
                        vm.listBranchs = null;
                    }
                },
                function (error) {
                    console.log(error);
                    $rootScope.$broadcast('preloader:hide');
                    Notification.clearAll();
                    Notification.error('Error al obtener las reservas.');
                });
        };

        vm.getFechBookings = function (fecha) {
            return getFecha(fecha);
        };

        vm.getHoraBookings = function (fecha) {
            return getHora(fecha);
        };

        vm.addBooking = function () {
            MainService.startService(1);            
            $location.url('/service');
        };

        vm.cancelBooking = function (ev, booking) {
            var confirm = $mdDialog.confirm()
                .title('Desea cancelar la Reserva?')
                .targetEvent(ev)
                .ok('Si')
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                $rootScope.$broadcast('preloader:active');
                BookingService.deleteBooking(booking).then(function (data) {
                    $rootScope.$broadcast('preloader:hide');
                    getListBranchs();
                }, function (error) {
                    console.log(error);
                    $rootScope.$broadcast('preloader:hide');
                    Notification.clearAll();
                    Notification.error('Error al anular la reserva.');
                });
            }, function () {
                Notification.clearAll();
            });
        };

        var calcularScreen = function () {
            var widthScreen = parseInt(window.innerWidth);
            if (widthScreen <= 400) {
                vm.Screen = ["col-xs-12"];
            } else if (widthScreen >= 401 && widthScreen <= 520) {
                vm.Screen = ["col-xs-offset-1", "col-xs-10"];
            } else if (widthScreen >= 521 && widthScreen <= 767) {
                vm.Screen = ["col-xs-offset-2", "col-xs-8"];
            } else if (widthScreen >= 768 && widthScreen <= 890) {
                vm.Screen = ["col-xs-offset-1", "col-xs-10"];
            } else if (widthScreen >= 891 && widthScreen <= 1100) {
                vm.Screen = ["col-xs-offset-2", "col-xs-8"];
            } else if (widthScreen >= 1101 && widthScreen <= 1360) {
                vm.Screen = ["col-xs-offset-3", "col-xs-6"];
            } else if (widthScreen >= 1361) {
                vm.Screen = ["col-xs-offset-4", "col-xs-4"];
            }
        };
    }
})();

(function() {
    'use strict';

    angular
        .module('app.booking')
        .controller('BranchController', BranchController);

    BranchController.$inject = ['$location', 'BookingService', '$rootScope'];

    /* @ngInject */
    function BranchController($location, BookingService, $rootScope) {
        var vm = this;

        activate();

        function activate() {
        }

        vm.listBranchs = null;
        var getBranchs = function() {
            $rootScope.$broadcast('preloader:active');
            var customer_id = JSON.parse(localStorage.getItem('loginData')).customer_id;
            BookingService.getBranchs(customer_id,"")
                .then(function(data) {
                    $rootScope.$broadcast('preloader:hide');
                    vm.listBranchs = data;
                },
                function(error) {
                  console.log(error);
                  $rootScope.$broadcast('preloader:hide');
                  Notification.clearAll();
                  Notification.error('Error al obtener las Agencias.');
              });
        };

        vm.navigateTo = function(branch, event) {
            localStorage.setItem('branchData', JSON.stringify(branch));
            $location.url('/booking');
        };

        getBranchs();
    }
})();

(function () {
    'use strict';

    angular.module('app.home')
    .directive('uiWave', uiWave)
    .directive('uiTime', uiTime)
    .directive('uiNotCloseOnClick', uiNotCloseOnClick)
    .directive('slimScroll', slimScroll);


    function uiWave() {
        var directive = {
            restrict: 'A',
            compile: compile
        };

        return directive;

        function compile(ele, attrs) {
            ele.addClass('ui-wave');
            var ink, d, x, y;
            ele.off('click').on('click', function(e){

            // console.log(ele);
            var $this = $(this);
            if($this.find(".ink").length === 0){
                $this.prepend("<span class='ink'></span>");
            }

            ink = $this.find(".ink");
            ink.removeClass("wave-animate");

            if(!ink.height() && !ink.width()){
                d = Math.max($this.outerWidth(), $this.outerHeight());
                ink.css({height: d, width: d});
            }

            x = e.pageX - $this.offset().left - ink.width()/2;
            y = e.pageY - $this.offset().top - ink.height()/2;

            ink.css({top: y+'px', left: x+'px'}).addClass("wave-animate");
            });
        }
    }

    function uiTime() {
        var directive = {
            restrict: 'A',
            link: link
        };

        return directive;

        function link(scope, ele) {
            var checkTime, startTime;

            startTime = function() {
            var h, m, s, t, time, today;
            today = new Date();
            h = today.getHours();
            m = today.getMinutes();
            s = today.getSeconds();
            m = checkTime(m);
            s = checkTime(s);
            time = h + ":" + m + ":" + s;
            ele.html(time);
            return t = setTimeout(startTime, 500);
            };

            checkTime = function(i) {
            if (i < 10) {
                i = "0" + i;
            }
            return i;
            };

            startTime();
        }
    }

    function uiNotCloseOnClick() {
        return {
            restrict: 'A',
            compile: function(ele, attrs) {
            return ele.on('click', function(event) {
                event.stopPropagation();
            });
            }
        };
    }

    function slimScroll() {
        return {
            restrict: 'A',
            link: function(scope, ele, attrs) {
            return ele.slimScroll({
                height: attrs.scrollHeight || '100%'
            });
            }
        };
    }

})();

(function () {
    'use strict';

    angular
        .module('app.home')
        .controller('MainController', MainController);

    MainController.$inject = ['$location', 'MainService'];

    /* @ngInject */
    function MainController($location, MainService) {

        this.services = MainService.getServices();

        this.navigateTo = function (serviceIndex) {

            MainService.startService(serviceIndex);
            $location.url('/service');
        };
    }
})();

(function () {
    'use strict';

    angular
        .module('app.home')
        .service('MainService', MainService);

    MainService.$inject = ['appConfig'];

    /* @ngInject */
    function MainService(appConfig) {

        this.services = appConfig.main.services;

        this.getServices = function () {
            return this.services;
        }

        this.startService = function (serviceIndex) {

            const service = this.services[serviceIndex];

            localStorage.setItem('serviceType', service.serviceType);
            localStorage.setItem('serviceLevel', 1);
            localStorage.setItem('services', JSON.stringify(service.services));

        }

    }
})();

(function () {
  'use strict';

  angular
    .module('app.home')
    .controller('ServiceController', ServiceController);

  ServiceController.$inject = ['$location', 'Notification', 'TicketService', '$rootScope'];

  /* @ngInject */
  function ServiceController($location, Notification, TicketService, $rootScope) {

    this.load = function () {
      this.serviceType = localStorage.getItem('serviceType');
      this.serviceLevel = parseInt(localStorage.getItem('serviceLevel'));
      this.services = JSON.parse(localStorage.getItem('services'));
    }

    this.navigateTo = function (serviceIndex) {

      const service = this.services[serviceIndex];

      if (service.id) {

        localStorage.setItem('serviceId', service.id);

        if (localStorage.getItem('agency') != null && this.serviceType !== 'booking') {
          var branch = localStorage.getItem('agency');
          var login = JSON.parse(localStorage.getItem('loginData'));
          TicketService.getBranch(branch).then(
            function (data) {
              const branch = data;
              console.log(data);
              var inputTicket = {
                'channel_id': TicketService.getChannel(),
                'branch_id': branch.id,
                'sector_id': branch.sectors[0].id,
                'service_id': service.id,
                'status': 'ENABLED',
                'customer_id': login.customer_id,
                'doc_type': login.typeDocument.id + "",
                'doc_number': login.document,
                'phone': login.code + login.cellphone,
              };

              $rootScope.$broadcast('preloader:active');

              TicketService.generateTicket(inputTicket)
                .then(
                  function (data) {
                    $rootScope.$broadcast('preloader:hide');
                    localStorage.setItem('ticketData', JSON.stringify(data));
                    $location.url('/ticketsummary');
                  },
                  function (error) {
                    console.log(error);
                    $rootScope.$broadcast('preloader:hide');
                    Notification.clearAll();
                    if (error.data.type === "CustomerTicketRestrictionException") {
                      Notification.warning('No puede generar otro ticket para el mismo servicio.');
                    }
                    else if (error.data.type === "SectorNotAvailableException") {
                      Notification.error('No hay ventanillas de atención disponibles');
                    }
                    else {
                      Notification.error('Error al generar ticket!');
                    }
                  }
                );
            },
            function (error) {
              console.log(error);
              Notification.clearAll();
              Notification.error('Error al generar ticket!');
            }
          );
        } else if (this.serviceType === 'ticket') {
          $location.url('/ticket');
        } else if (this.serviceType === 'booking') {
          $location.url('/branch');
        }

      } else {

        localStorage.setItem('serviceLevel', this.serviceLevel + 1);
        localStorage.setItem('services', JSON.stringify(this.services[serviceIndex].services));

        this.load();

      }


    };

    this.load();
  }
})();

(function () {
    'use strict';

    angular.module('app.core')
        .factory('appConfig', [appConfig])
        .config(['$qProvider', providerConfig])
        .config(['$mdThemingProvider', mdConfig])
        .config(['NotificationProvider', notificationConfig])
        .config(['$compileProvider', compileProvider]);

    function appConfig() {
        var date = new Date();
        var year = date.getFullYear();
        var main = {
            brand: 'HIPER',
            name: 'BMatic',
            keyGoogleMaps: 'AIzaSyBwCY1vKY-raGCKvNGBJXlYw5Gef8buKoQ',
            typeLocation: 'GPS-API',
            channel_id: '001',
            services: [
                {
                    'name': 'Generar Ticket',
                    'icon': './assets/icons/generar-ticket.png',
                    'serviceType': 'ticket',
                    'services': [
                        {
                            'name': 'Ventanilla',
                            'icon': './assets/icons/cheques.png',
                            'id': 'X002',
                            'enabled': true
                        },
                        {
                            'name': 'Comercial',
                            'icon': './assets/icons/apertura-cuenta.jpg',
                            'id': 'X002',
                            'enabled': true
                        }
                    ]
                },
                {
                    'name': 'Solicitar Cita',
                    'icon': './assets/icons/solicitar-reserva.jpg',
                    'serviceType': 'booking',
                    'services': [
                        {
                            'name': 'Ventanilla',
                            'icon': './assets/icons/cheques.png',
                            'id': 'X002',
                            'enabled': true
                        },
                        {
                            'name': 'Comercial',
                            'icon': './assets/icons/apertura-cuenta.jpg',
                            'id': 'X002',
                            'enabled': true
                        }
                    ]
                }
            ],
            listTypeDocument: [
                {
                    'id': '1',
                    'name': 'DNI',
                    'inputMask': '99999999',
                    'maxlenght': '8'
                },
                {
                    'id': '2',
                    'name': 'Pasaporte',
                    'inputMask': '999999999999999',
                    'maxlenght': '15'
                }
            ],
            phone:
            {
                'inputMask': '9999-9999',
                'maxlenght': '8'
            },
            year: year,
            layout: 'wide',
            menu: 'vertical',
            isMenuCollapsed: false,
            fixedHeader: true,
            fixedSidebar: true,
            link: 'https://www.hiper.com.pe/',
            host: 'http://34.216.118.190:8091/api/v1',
			apimtc:'https://sptc.mtc.gob.pe/CitasOnline/api/email/Send'
        };

        return {
            main: main
        };
    }

    function providerConfig($qProvider) {
        $qProvider.errorOnUnhandledRejections(false);
    }

    function mdConfig($mdThemingProvider) {
        // var cyanAlt = $mdThemingProvider.extendPalette('cyan', {
        //     'contrastLightColors': '500 600 700 800 900',
        //     'contrastStrongLightColors': '500 600 700 800 900'
        // });
        var lightGreenAlt = $mdThemingProvider.extendPalette('light-green', {
            'contrastLightColors': '500 600 700 800 900',
            'contrastStrongLightColors': '500 600 700 800 900'
        });

        var branchTheme = $mdThemingProvider.extendPalette('red', {
            '500': '#1998cb'
        });

        $mdThemingProvider
            .definePalette('branchTheme', branchTheme)
            .definePalette('lightGreenAlt', lightGreenAlt);

        $mdThemingProvider.theme('default')
            .primaryPalette('branchTheme', {
                'default': '500'
            })
            .accentPalette('branchTheme', {
                'default': '500'
            })
            .warnPalette('branchTheme', {
                'default': '500'
            })
            .backgroundPalette('grey');
    }

    function notificationConfig(NotificationProvider) {
        NotificationProvider.setOptions({
            delay: 5000,
            startTop: 20,
            startRight: 10,
            verticalSpacing: 20,
            horizontalSpacing: 20,
            positionX: 'center',
            positionY: 'top'
        });
    }

    function compileProvider($compileProvider, moment) {
        $compileProvider.preAssignBindingsEnabled(true);
    }
})();

(function () {
    'use strict';

    angular.module('app')
        .controller('AppCtrl', [ '$scope', '$rootScope', '$state', '$document', 'appConfig', AppCtrl]); // overall control
    
    function AppCtrl($scope, $rootScope, $state, $document, appConfig) {

        $scope.main = appConfig.main;        

        $scope.$watch('main', function(newVal, oldVal) {

            if (newVal.menu === 'horizontal' && oldVal.menu === 'vertical') {
                $rootScope.$broadcast('nav:reset');
            }
            if (newVal.fixedHeader === false && newVal.fixedSidebar === true) {
                if (oldVal.fixedHeader === false && oldVal.fixedSidebar === false) {
                    $scope.main.fixedHeader = true;
                    $scope.main.fixedSidebar = true;
                }
                if (oldVal.fixedHeader === true && oldVal.fixedSidebar === true) {
                    $scope.main.fixedHeader = false;
                    $scope.main.fixedSidebar = false;
                }
            }
            if (newVal.fixedSidebar === true) {
                $scope.main.fixedHeader = true;
            }
            if (newVal.fixedHeader === false) {
                $scope.main.fixedSidebar = false;
            }
        }, true);


        $rootScope.$on("$stateChangeSuccess", function (event, currentRoute, previousRoute) {
            $document.scrollTo(0, 0);
        });
    }

})(); 
(function () {
    'use strict';

    angular.module('app')
        .config(['$ocLazyLoadProvider', function($ocLazyLoadProvider) {
            $ocLazyLoadProvider.config({
                debug: false,
                events: false,
                modules: [
                    {
                        name: 'fontawesome',
                        files: [
                            'bower_components/font-awesome/css/font-awesome.css'
                        ]
                    },
                    {
                        name: 'weather-icons',
                        files: [
                            'bower_components/weather-icons/css/weather-icons.min.css'
                        ]
                    },
                    {
                        name: 'googlemap',
                        files: [                            
                            'bower_components/ngmap/build/scripts/ng-map.min.js'
                        ]
                    }
                ]
            });
        }]
    );

})();

(function () {
    'use strict';

    angular.module('app')
        .config(['$stateProvider', '$urlRouterProvider', '$ocLazyLoadProvider',
                function($stateProvider, $urlRouterProvider, $ocLazyLoadProvider) {

                $stateProvider
                    .state('login', {
                        url: '/login',
                        templateUrl: 'app/login/register.html',
                        controller: 'RegisterController',
                        controllerAs: 'registerCtrl'
                    })
                    .state('main', {
                        url: '/main',
                        templateUrl: 'app/home/main.html',
                        controller: 'MainController',
                        controllerAs: 'mainCtrl'
                    })
                    .state('service', {
                        url: '/service',
                        templateUrl: 'app/home/service.html',
                        controller: 'ServiceController',
                        controllerAs: 'serviceCtrl'
                    })
                    .state('branch', {
                        url: '/branch',
                        templateUrl: 'app/booking/branch.html',
                        controller: 'BranchController',
                        controllerAs: 'branchCtrl'
                    })
                    .state('sector', {
                        url: '/sector',
                        templateUrl: 'app/ticket/sector.html',
                        controller: 'SectorController',
                        controllerAs: 'sectorCtrl'
                    })
                    .state('booking', {
                        url: '/booking',
                        templateUrl: 'app/booking/booking.html',
                        controller: 'BookingController',
                        controllerAs: 'bookingCtrl'
                    })
                    .state('bookings', {
                        url: '/bookings',
                        templateUrl: 'app/booking/bookings.html',
                        controller: 'BookingsController',
                        controllerAs: 'bookingsCtrl'
                    })
                    .state('ticket', {
                        url: '/ticket',
                        templateUrl: 'app/ticket/ticket.html',
                        controller: 'TicketController',
                        controllerAs: 'ticketCtrl',
                        resolve: {
                            deps: ['$ocLazyLoad', function($ocLazyLoad) {
                                return $ocLazyLoad.load([
                                    'googlemap'
                                ]);
                            }]
                        }
                    })
                    .state('ticketsummary', {
                        url: '/ticketsummary',
                        templateUrl: 'app/ticket/ticketsummary.html',
                        controller: 'TicketSummaryController',
                        controllerAs: 'ticketSummaryCtrl'
                    })
                    .state('tickets', {
                        url: '/tickets',
                        templateUrl: 'app/ticket/tickets.html',
                        controller: 'TicketsController',
                        controllerAs: 'ticketsCtrl'
                    });

                $urlRouterProvider
                    .when('/', '/login')
                    .otherwise('/login');
            }
        ]);
})();

(function () {

    angular.module('app.i18n', ['pascalprecht.translate'])
        .config(['$translateProvider', i18nConfig]);

    function i18nConfig($translateProvider) {
        $translateProvider.preferredLanguage('es');
        $translateProvider.useSanitizeValueStrategy(null);
    }
})();

(function () {
    'use strict';

    angular.module('app.login', ['ui.mask'])
        .directive('customPage', customPage);

    // add class for specific pages to achieve fullscreen, custom background etc.
    function customPage() {
        var directive = {
            restrict: 'A',
            controller: ['$scope', '$element', '$location', customPageCtrl]
        };

        return directive;

        function customPageCtrl($scope, $element, $location) {
            var addBg, path;

            path = function() {
                return $location.path();
            };

            addBg = function(path) {
                $element.removeClass('on-canvas');
                $element.removeClass('body-wide body-err body-lock body-auth');
                switch (path) {
                    case '/404':
                    case '/500':
                        return $element.addClass('body-wide body-err');
                    case '/login':
                    case '/register':
                        return $element.addClass('body-wide body-auth');
                    case '/page/lock-screen':
                        return $element.addClass('body-wide body-lock');
                }
            };

            addBg($location.path());

            $scope.$watch(path, function(newVal, oldVal) {
                if (newVal === oldVal) {
                    return;
                }
                return addBg($location.path());
            });
        }
    }

})();

(function () {
    'use strict';

    angular
        .module('app.login')
        .service('LoginService', LoginService);

    LoginService.$inject = ['$http', 'appConfig'];
    /* @ngInject */
    function LoginService($http, appConfig) {

        this.logeo = function (recaptcha) {
            return $http({
                url: appConfig.main.host + '/login',
                method: 'GET',
                data: null,
                headers: {
                    "proxy": 'isLogin',
                    "tokken": recaptcha
                },
            }).then(function (response, status, headers) {
                console.log("headers:" + headers.names);
                console.log("headers:" + headers.count);
                console.log("headers:" + headers);
                console.log("status" + status);
                console.log(response.data);
                return response.status;
            }, function (error) {
                throw error;
            });
        };

        this.registerAgency = function () {
            const url = new URL(window.location.href);
            const agency = url.searchParams.get("agency");
            if (agency != null) {
                localStorage.setItem("agency", agency);
            } else {
                localStorage.removeItem("agency");
            }
        }

    }
})();

(function () {
    'use strict';

    angular.module('app.login')
        .directive('phoneformat', phoneFormat);

    // add class for specific pages to achieve fullscreen, custom background etc.
    function phoneFormat() {
        var directive = {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                // console.log(isNaN(attr));
                // Nan(attr)
                // if (!isNaN(attr)) alert("");
                var phoneParse = function (value) {
                    var numbers = value && value.replace(/-/g, "");
                    var regex = attr.phonetype === 'id' ?  /^\d{10}$/ : /^\d{8}$/;
                    if (regex.test(numbers)) {
                        return numbers;
                    }

                    return undefined;
                }
                var phoneFormat = function (value) {
                    if(value){
                        value = value.toString();
                        // console.log(value.toString());
                        if (value.indexOf("-") == -1){
                            var numbers = value && value.replace(/-/g,"");
                            var regex = attr.phonetype === 'id' ? /^(\d{2})(\d{4})(\d{4})$/ : /^(\d{4})(\d{4})$/;
                            var matches = numbers && numbers.match(regex);

                            if (matches) {
                                return matches[1] + "-" + matches[2] + (attr.phonetype === 'id' ? ("-" + matches[3]) : '');
                            }

                            return undefined;
                        }else{
                            return value;
                        }


                    }


                }
                ngModelCtrl.$parsers.push(phoneParse);
                ngModelCtrl.$formatters.push(phoneFormat);

                element.bind("blur", function () {
                    if (attr.phonetype ==='id'){
                        if (element.val().indexOf("-") == -1){
                            var value = phoneFormat(element.val().substr(0,10));
                        }else{
                            var valdata = element.val();
                            var arrvaldata = valdata.split("-");
                            var realvaldata="";
                            for (var index = 0; index < arrvaldata.length; index++) {
                                realvaldata += arrvaldata[index];
                            }
                            var value = phoneFormat(realvaldata.substr(0,10));
                        }
                    }else{
                        if (element.val().indexOf("-") == -1){
                            var value = phoneFormat(element.val().substr(0,8));
                        }else{
                            var valdata = element.val();
                            var arrvaldata = valdata.split("-");
                            var realvaldata = '';
                            for (var index = 0; index < arrvaldata.length; index++) {
                                realvaldata += arrvaldata[index];
                            }
                            var value = phoneFormat(realvaldata.substr(0,8));
                        }
                    }

                    var isValid = !!value;
                    if (isValid) {
                        ngModelCtrl.$setViewValue(value);
                        ngModelCtrl.$render();
                    }

                    ngModelCtrl.$setValidity("phoneformat", isValid);
                    scope.$apply();
                });
            }
        };

        return directive;
    }

})();

(function () {
  'use strict';

  angular
    .module('app.login')
    .controller('RegisterController', RegisterController).run(['$rootScope', '$state', function ($rootScope, $state) {
      $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {

        var isNavigatingToAuth = toState.name === "login";

        if (isNavigatingToAuth) {

          return;
        }

        if (!sessionStorage.getItem('loginDataSession')) {

          $state.go("login");
          event.preventDefault();
        }
      });
    }]);

  RegisterController.$inject = ['$location', 'LoginService', 'MainService', 'Notification', 'appConfig'];



  /* @ngInject */
  function RegisterController($location, LoginService, MainService, Notification, appConfig) {

    LoginService.registerAgency();

    var vm = this;
    vm.documentRequired = true;

    activate();
    function activate() {
      vm.sitekey = appConfig.sitekey;
    }

    vm.selectTypeDocument = null;
    vm.listTypeDocument = appConfig.main.listTypeDocument;
    vm.inputMaskCellphone = appConfig.main.phone.inputMask;
    vm.inputMask = '999999999999999';
    vm.maxlenght = 15;

    vm.changeMask = function () {
      vm.listTypeDocument.forEach(document => {
        if (vm.selectTypeDocument.id === document.id) {
          vm.inputMask = document.inputMask;
          vm.maxlenght = document.maxlenght;
          if (document.id === "1") {
            vm.documentMessage = '9 dígitos sin 0 al inicio';
          } else {
            vm.documentMessage = '';
          }
        }
      });
    };


    var loadLogin = function () {
      if (localStorage.getItem('loginData')) {
        var login = JSON.parse(localStorage.getItem('loginData'));
        vm.selectTypeDocument = login.typeDocument;
        vm.document = login.document;
        vm.cellphone = login.cellphone;
        vm.username = login.username;
		vm.email = login.email;
        vm.documentrequired = false;
      }
    };

    vm.login = function () {
      var loginData = {
        typeDocument: vm.selectTypeDocument,
        document: vm.document,
        code: '+51',
        cellphone: vm.cellphone,
        customer_id: vm.selectTypeDocument.id + "-" + vm.document,
        username: vm.username,
		email : vm.email
      };
      sessionStorage.setItem('loginDataSession', JSON.stringify(loginData));
      localStorage.setItem('loginData', JSON.stringify(loginData));
      if (localStorage.getItem('agency') != null) {
        MainService.startService(0);            
        $location.url('/service');
      } else {
        $location.url('/main');
      }
    };
    loadLogin();
  }
})();

(function () {
    'use strict';

    angular.module('app.layout')
        // quickview
        .directive('toggleQuickview', toggleQuickview)

        .directive('uiPreloader', ['$rootScope', uiPreloader]);

    function toggleQuickview() {
        var directive = {
            restrict: 'A',
            link: link
        };

        return directive;

        function link(scope, el, attrs) {
            var $el = $(el[0]);
            // #app not #body
            var $body = $('#app');

            $el.on('click', function(e) {
                var qvClass = 'quickview-open';

                if (attrs.target) {
                    var qvClass = qvClass + '-' + attrs.target;
                }

                // CSS class on body instead of #quickview
                // because before ng-include load quickview.html, you'll fail to get $('#')
                $body.toggleClass(qvClass);
                e.preventDefault();
            });

        }
    }

    function uiPreloader($rootScope) {
        return {
            restrict: 'A',
            template:'<span class="bar"></span>',
            link: function(scope, el, attrs) {        
                el.addClass('preloaderbar hide');
                scope.$on('$stateChangeStart', function(event) {
                    el.removeClass('hide').addClass('active');
                });
                scope.$on('$stateChangeSuccess', function( event, toState, toParams, fromState ) {
                    event.targetScope.$watch('$viewContentLoaded', function(){
                        el.addClass('hide').removeClass('active');
                    })
                });

                scope.$on('preloader:active', function(event) {
                    el.removeClass('hide').addClass('active');
                });
                scope.$on('preloader:hide', function(event) {
                    el.addClass('hide').removeClass('active');
                });                
            }
        };        
    }
})(); 


(function () {
    $(window).load(function(){
        setTimeout( hideLoader , 1000)
    });

    function hideLoader() {
        $('#loader-container').fadeOut("slow")
    }    
})(); 

(function () {
    'use strict';

    angular.module('app.layout')
        .directive('toggleNavCollapsedMin', ['$rootScope', toggleNavCollapsedMin])
        .directive('collapseNav', collapseNav)
        .directive('highlightActive', highlightActive)
        .directive('toggleOffCanvas', toggleOffCanvas);

    // switch for mini style NAV, realted to 'collapseNav' directive
    function toggleNavCollapsedMin($rootScope) {
        var directive = {
            restrict: 'A',
            link: link
        };

        return directive;

        function link(scope, ele, attrs) {
            var app;

            app = $('#app');

            ele.on('click', function(e) {
                if (app.hasClass('nav-collapsed-min')) {
                    app.removeClass('nav-collapsed-min');
                } else {
                    app.addClass('nav-collapsed-min');
                    $rootScope.$broadcast('nav:reset');
                }
                return e.preventDefault();
            });            
        }
    }

    // for accordion/collapse style NAV
    function collapseNav() {
        var directive = {
            restrict: 'A',
            link: link
        };

        return directive;

        function link(scope, ele, attrs) {
            var $a, $aRest, $app, $lists, $listsRest, $nav, $window, Timer, prevWidth, slideTime, updateClass;

            slideTime = 250;

            $window = $(window);

            $lists = ele.find('ul').parent('li');

            $lists.append('<i class="fa fa-angle-down icon-has-ul-h"></i>');

            $a = $lists.children('a');
            $a.append('<i class="fa fa-angle-down icon-has-ul"></i>');

            $listsRest = ele.children('li').not($lists);

            $aRest = $listsRest.children('a');

            $app = $('#app');

            $nav = $('#nav-container');

            $a.on('click', function(event) {
                var $parent, $this;
                if ($app.hasClass('nav-collapsed-min') || ($nav.hasClass('nav-horizontal') && $window.width() >= 768)) {
                    return false;
                }
                $this = $(this);
                $parent = $this.parent('li');
                $lists.not($parent).removeClass('open').find('ul').slideUp(slideTime);
                $parent.toggleClass('open').find('ul').stop().slideToggle(slideTime);
                event.preventDefault();
            });

            $aRest.on('click', function(event) {
                $lists.removeClass('open').find('ul').slideUp(slideTime);
            });

            scope.$on('nav:reset', function(event) {
                $lists.removeClass('open').find('ul').slideUp(slideTime);
            });

            Timer = void 0;

            prevWidth = $window.width();

            updateClass = function() {
                var currentWidth;
                currentWidth = $window.width();
                if (currentWidth < 768) {
                    $app.removeClass('nav-collapsed-min');
                }
                if (prevWidth < 768 && currentWidth >= 768 && $nav.hasClass('nav-horizontal')) {
                    $lists.removeClass('open').find('ul').slideUp(slideTime);
                }
                prevWidth = currentWidth;
            };

            $window.resize(function() {
                var t;
                clearTimeout(t);
                t = setTimeout(updateClass, 300);
            });
          
        }
    }

    // Add 'active' class to li based on url, muli-level supported, jquery free
    function highlightActive() {
        var directive = {
            restrict: 'A',
            controller: [ '$scope', '$element', '$attrs', '$location', highlightActiveCtrl]
        };

        return directive;

        function highlightActiveCtrl($scope, $element, $attrs, $location) {
            var highlightActive, links, path;

            links = $element.find('a');

            path = function() {
                return $location.path();
            };

            highlightActive = function(links, path) {
                path = '#!' + path;
                return angular.forEach(links, function(link) {
                    var $li, $link, href;
                    $link = angular.element(link);
                    $li = $link.parent('li');
                    href = $link.attr('href');
                    if ($li.hasClass('active')) {
                        $li.removeClass('active');
                    }
                    if (path.indexOf(href) === 0) {
                        return $li.addClass('active');
                    }
                });
            };

            highlightActive(links, $location.path());

            $scope.$watch(path, function(newVal, oldVal) {
                if (newVal === oldVal) {
                    return;
                }
                return highlightActive(links, $location.path());
            });

        }

    }

    // toggle on-canvas for small screen, with CSS
    function toggleOffCanvas() {
        var directive = {
            restrict: 'A',
            link: link
        };

        return directive;

        function link(scope, ele, attrs) {
            ele.on('click', function() {
                return $('#app').toggleClass('on-canvas');
            });         
        }
    }


})(); 




(function() {
    'use strict';

    angular
        .module('app.ticket')
        .controller('SectorController', sectorController);

    sectorController.$inject = ['$location', '$rootScope'];

    /* @ngInject */
    function sectorController($location, $rootScope) {
        var vm = this;

        function activate() {

        }

        activate();

        vm.listSertors = null;
        var branchID = null;

        var getSectors = function(){
          if (localStorage.getItem('branchData')) {
            var branch = JSON.parse(localStorage.getItem('branchData'));
            branchID = branch.id;
            vm.listSertors = branch.sectors;
          }
        };

        getSectors();
    }
})();

(function () {
    'use strict';

    angular
        .module('app.ticket')
        .controller('TicketController', TicketController);

    TicketController.$inject = ['NgMap', '$location', 'TicketService', 'Notification', '$rootScope', 'appConfig'];

    /* @ngInject */
    function TicketController(NgMap, $location, TicketService, Notification, $rootScope, appConfig) {
        var vm = this;
        vm.listBranchs = [];
        vm.branch = vm.listBranchs[0];
        vm.queueTypes = [];
        vm.keyGoogleMaps = appConfig.main.keyGoogleMaps;

        var getBranchs = function () {

            $rootScope.$broadcast('preloader:active');
            TicketService.getLocate().then(function (data) {
                vm.latitude = data.location.lat;
                vm.longitude = data.location.lng;

                NgMap.getMap('gmap').then(function (map) {
                    vm.map = map;
                }).catch(function (map) {
                    console.error('map error: ', map);
                });

            });

            TicketService.getBranchs(vm.latitude, vm.longitude)
                .then(function (data) {
                    $rootScope.$broadcast('preloader:hide');
                    vm.listBranchs = data;
                    for (var i = 0; i < vm.listBranchs.length; i++) {
                        if (vm.listBranchs[i].status === 'INACTIVE') {
                            vm.listBranchs[i].icon = './assets/map/map-marker-gray.png';
                        } else {
                            if (vm.listBranchs[i].congestion === 'LOW') {
                                vm.listBranchs[i].icon = './assets/map/map-marker-green.png';
                            } else if (vm.listBranchs[i].congestion === 'MEDIUM') {
                                vm.listBranchs[i].icon = './assets/map/map-marker-yellow.png';
                            } else {
                                vm.listBranchs[i].icon = './assets/map/map-marker-red.png';
                            }
                        }
                    }
                },
                    function (error) {
                        console.log(error);
                        $rootScope.$broadcast('preloader:hide');
                        Notification.clearAll();
                        Notification.error('Error al obtener las agencias!');
                    });
        };

        vm.showDetail = function (e, branch) {
            vm.branch = branch;
            TicketService.getBranch(branch.id)
                .then(function (data) {
                    console.log(data)
                    vm.queueTypes = data;
                    vm.map.showInfoWindow('foo-iw', branch.id);
                },
                    function (error) {
                        console.log(error);
                    });

        };

        var hideDetail = function () {
            vm.map.hideInfoWindow('foo-iw');
        };

        vm.clicked = function (branch) {
            hideDetail();
            $rootScope.$broadcast('preloader:active');
            if (branch.sectors.length > 1) {
                localStorage.setItem('branchData', JSON.stringify(branch));
                $location.url('/sector');
            } else {
                var login = JSON.parse(localStorage.getItem('loginData'));
                var channel_id = TicketService.getChannel();
                var inputTicket = {
                    'channel_id': channel_id,
                    'branch_id': branch.id,
                    'sector_id': branch.sectors[0].id,
                    'service_id': localStorage.getItem('serviceId'),
                    'status': 'ENABLED',
                    'customer_id': login.customer_id,
                    'doc_type': login.typeDocument.id + "",
                    'doc_number': login.document,
                    'phone':  login.code + login.cellphone,
                };

                TicketService.generateTicket(inputTicket)
                    .then(function (data) {
                        $rootScope.$broadcast('preloader:hide');
                        localStorage.setItem('ticketData', JSON.stringify(data));
                        $location.url('/ticketsummary');
                    },
                        function (error) {
                            console.log(error);
                            $rootScope.$broadcast('preloader:hide');
                            Notification.clearAll();
                            if (error.data.type === "CustomerTicketRestrictionException") {
                                Notification.warning('No puede generar otro ticket para el mismo servicio');
                            } else {
                                Notification.error('Error al generar ticket!');
                            }
                        });
            }
        };

        getBranchs();
    }
})();

(function () {
    'use strict';

    angular
        .module('app.ticket')
        .service('TicketService', TicketService);

    TicketService.$inject = ['$http', 'appConfig'];

    /* @ngInject */
    function TicketService($http, appConfig) {
        function fInit() { }

        this.function = fInit;

        this.GPS = function () {
            return new Promise((resolver, rechazar) => {
                var data = { location: { lat: 0, lng: 0 }, accuracy: 0 };

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function (geolocate) {
                            data.location.lat = geolocate.coords.latitude;
                            data.location.lng = geolocate.coords.longitude;
                            data.accuracy = geolocate.coords.accuracy;
                            resolver(data);
                        }
                    );
                }

            });
        };

        this.API = function () {
            return $http({
                url: 'https://www.googleapis.com/geolocation/v1/geolocate?key=' + appConfig.main.keyGoogleMaps,
                method: 'POST'
            }).then(
                function (response) {
                    return response.data;
                },
                function (error) {
                    throw error;
                });
        };

        this.GPS_API = function () {
            return new Promise((resolver) => {
                var data = { location: { lat: 0, lng: 0 }, accuracy: 0 };

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function (geolocate) {
                            console.log("Localizacion por GPS");
                            data.location.lat = geolocate.coords.latitude;
                            data.location.lng = geolocate.coords.longitude;
                            data.accuracy = geolocate.coords.accuracy;
                            resolver(data);
                        }, function (error) {
                            $http({
                                url: 'https://www.googleapis.com/geolocation/v1/geolocate?key=' + appConfig.main.keyGoogleMaps,
                                method: 'POST'
                            }).then(
                                function (response) {
                                    console.log("Localizacion por Google API");
                                    resolver(response.data);
                                },
                                function (error) {
                                    throw error;
                                });
                        }
                    );
                }

            });
        };

        if (appConfig.main.typeLocation == 'GPS') {

            console.log("Configurado GPS");

            this.getLocate = this.GPS;


        } else if (appConfig.main.typeLocation == 'API') {

            console.log("Condigurado por Google API");

            this.getLocate = this.API;

        } else {

            console.log("Configurado por GPS / Google API");

            this.getLocate = this.GPS_API;

        }

        this.getBranchs = function (latitude, longitude) {


            return $http({
                url: appConfig.main.host + '/branches/',
                method: 'GET',
                params: {
                    'limit': 200,
                    'latitude': latitude,
                    'longitude': longitude,
                    'services': localStorage.getItem('serviceId')
                }
            })
                .then(
                    function (response) {
                        return response.data;
                    },
                    function (error) {
                        throw error;
                    });
        };

        this.generateTicket = function (inputTicket) {
            return $http({
                url: appConfig.main.host + '/tickets/',
                method: 'POST',
                data: JSON.stringify(inputTicket)
            })
                .then(
                    function (response) {
                        return (response.data);
                    },
                    function (error) {
                        throw error;
                    }
                );
        };

        this.getTickets = function (customer_id) {
            return $http({
                url: appConfig.main.host + '/tickets/',
                method: 'GET',
                params: {
                    'customer_id': customer_id
                }
            })
                .then(
                    function (response) {
                        return (response.data);
                    },
                    function (error) {
                        throw error;
                    });
        };

        this.getTicket = function (ticket, fields) {
            var params = fields === '' ? {} : { fields: fields };

            return $http({
                url: appConfig.main.host + '/tickets/' + ticket.id,
                method: 'GET',
                params: params
            })
                .then(
                    function (response) {
                        return response.data;
                    },
                    function (error) {
                        throw error;
                    }
                );
        };

        this.deteleTicket = function (ticket) {
            return $http.delete(appConfig.main.host + '/tickets/' + ticket.id)
                .then(
                    function (response) {
                        return (response.data);
                    },
                    function (error) {
                        throw error;
                    });
        };
        this.getBranch = function (branchID) {


            return $http({
                url: appConfig.main.host + '/branches/' + branchID,
                method: 'GET',
                params: {
                    'service': localStorage.getItem('serviceId')
                }
            })
                .then(
                    function (response) {
                        return response.data;
                    },
                    function (error) {
                        throw error;
                    }
                );
        };

        this.getChannel = function () {
            return appConfig.main.channel_id;
        };

    }



})();
(function() {
    'use strict';

    angular
        .module('app.ticket')
        .controller('TicketsController', TicketsController);

    TicketsController.$inject = ['$location', '$mdDialog', 'MainService', 'TicketService', 'Notification', '$rootScope'];

    /* @ngInject */
    function TicketsController($location, $mdDialog, MainService, TicketService, Notification, $rootScope) {
        var vm = this;
        vm.listTickets = null;
        vm.Screen = [];
        vm.updateTimer = '';

        vm.$onInit = function() {
            calcularScreen();
            getTickets();
        };

        var getTickets = function() {
            $rootScope.$broadcast('preloader:active');
            var login = JSON.parse(localStorage.getItem('loginData'));
            TicketService.getTickets(login.customer_id)
                .then(function(data) {
                        $rootScope.$broadcast('preloader:hide');
                        if (data.length > 0) {
                            vm.listTickets = data;
                        } else {
                            vm.listTickets = null;
                        }
                    },
                    function(error) {
                      console.error(error);
                      $rootScope.$broadcast('preloader:hide');
                        Notification.clearAll();
                        Notification.error('Error al obtener los tickets.');
                    });
        };

        vm.addTicket = function() {
            MainService.startService(0);            
            $location.url('/service');
        };

        vm.cancelTicket = function(ev, ticket) {
            var confirm = $mdDialog.confirm()
                .title('Desea cancelar el ticket?')
                .targetEvent(ev)
                .ok('Si')
                .cancel('No');
            $mdDialog.show(confirm).then(function() {
                $rootScope.$broadcast('preloader:active');
                TicketService.deteleTicket(ticket)
                .then(function(data) {
                  $rootScope.$broadcast('preloader:hide');
                    getTickets();
                }, function(error) {
                    console.error(error);
                    $rootScope.$broadcast('preloader:hide');
                    Notification.clearAll();
                    if (error.status === 404) {
                        Notification.warning('Ticket no disponible.');
                    } else {
                        Notification.error('Error al cancelar ticket.');
                    }
                    getTickets();
                });
            }, function() {
                Notification.clearAll();
            });
        };

        vm.showTimer = function($event, ticket) {
            vm.updateTimer = 'fa-spin';
            $rootScope.$broadcast('preloader:active');
            var fields = "position,low_estimated_time,high_estimated_time,status";
            TicketService.getTicket(ticket, fields)
            .then(function(data) {
                $rootScope.$broadcast('preloader:hide');
                ticket.position = data.position;
                ticket.low_estimated_time = data.low_estimated_time;
                ticket.high_estimated_time = data.high_estimated_time;
                ticket.status = data.status;
                vm.updateTimer = '';
            }, function(error) {
              console.error(error);
                $rootScope.$broadcast('preloader:hide');
                Notification.clearAll();
                if (error.status === 404) {
                    Notification.warning('Ticket no disponible.');
                } else {
                    Notification.error('Error al actualizar ticket.');
                }
                vm.updateTimer = '';
                getTickets();
            });
        };

        var calcularScreen = function() {
            var widthScreen = parseInt(window.innerWidth);
            if (widthScreen <= 400) {
                vm.Screen = ['col-xs-12'];
            } else if (widthScreen >= 401 && widthScreen <= 520) {
                vm.Screen = ['col-xs-offset-1', 'col-xs-10'];
            } else if (widthScreen >= 521 && widthScreen <= 767) {
                vm.Screen = ['col-xs-offset-2', 'col-xs-8'];
            } else if (widthScreen >= 768 && widthScreen <= 890) {
                vm.Screen = ['col-xs-offset-1', 'col-xs-10'];
            } else if (widthScreen >= 891 && widthScreen <= 1100) {
                vm.Screen = ['col-xs-offset-2', 'col-xs-8'];
            } else if (widthScreen >= 1101 && widthScreen <= 1360) {
                vm.Screen = ['col-xs-offset-3', 'col-xs-6'];
            } else if (widthScreen >= 1361) {
                vm.Screen = ['col-xs-offset-4', 'col-xs-4'];
            }
        };

        // vm.showTimer();
    }
})();

(function() {
    'use strict';

    angular
        .module('app.ticket')
        .controller('TicketSummaryController', TicketSummaryController);

    TicketSummaryController.$inject = ['$location', '$mdDialog', 'Notification', 'TicketService', '$rootScope'];

    /* @ngInject */
    function TicketSummaryController($location, $mdDialog, Notification, TicketService, $rootScope) {
        var vm = this;
        vm.updateTimer = "";
        vm.printTicket = null;
        vm.Screen = [];
        vm.ticket = null;

        vm.$onInit = function() {
            calcularScreen();
            loadTicket();
        };

        var loadTicket = function() {
          $rootScope.$broadcast('preloader:active');
            if (localStorage.getItem('ticketData')) {
                var ticket = JSON.parse(localStorage.getItem('ticketData'));
                vm.printTicket = ticket.print;
                vm.ticket = ticket;
            } 
           /* TicketService.getTicket(ticket, "status")
            .then(function(data) {
                $rootScope.$broadcast('preloader:hide');
                if (data.status !== 'WAITING') {
                    $location.url('/tickets');
                }
            }, function(error) {
                console.error(error);
                $rootScope.$broadcast('preloader:hide');
                Notification.clearAll();
                if (error.status === 404) {
                    Notification.warning('Ticket no disponible.');
                    $location.url('/tickets');
                } else {
                    Notification.error('Error al obtener ticket.');
                }
            });
        */
        };

        vm.showTimer = function($event, ticket) {
            vm.updateTimer = 'fa-spin';
            $rootScope.$broadcast('preloader:active');
            var fields = "position,low_estimated_time,high_estimated_time,status";
            TicketService.getTicket(ticket, fields)
            .then(function(data) {
                $rootScope.$broadcast('preloader:hide');
                if (data.status !== 'WAITING') {
                    $location.url('/tickets');
                }
                vm.ticket.position = data.position;
                vm.ticket.low_estimated_time = data.low_estimated_time;
                vm.ticket.high_estimated_time = data.high_estimated_time;
                vm.updateTimer = '';
            }, function(error) {
                console.error(error);
                $rootScope.$broadcast('preloader:hide');
                Notification.clearAll();
                if (error.status === 404) {
                    Notification.warning('Ticket no disponible.');
                    $location.url('/tickets');
                } else {
                    Notification.error('Error al actualizar ticket.');
                }
                vm.updateTimer = '';
            });
        };

        vm.cancelTicket = function(ev, ticket) {
            var confirm = $mdDialog.confirm()
                .title('Desea cancelar el ticket?')
                .targetEvent(ev)
                .ok('Si')
                .cancel('No');
            $mdDialog.show(confirm).then(function() {
              $rootScope.$broadcast('preloader:active');
                TicketService.deteleTicket(ticket)
                .then(function(data) {
                  $rootScope.$broadcast('preloader:hide');
                  $location.url('/tickets');
                }, function(error) {
                    console.error(error);
                    $rootScope.$broadcast('preloader:hide');
                    Notification.clearAll();
                    if (error.status === 404) {
                        Notification.warning('Ticket no disponible.');
                        $location.url('/tickets');
                    }else if(error.data.type === 'CancellationOfTicketNotAllowedException'){
                        Notification.warning('No se puede cancelar el Ticket.');
                        $location.url('/tickets');
                    } else {
                        Notification.error('Error al cancelar ticket.');
                    }
                });
            }, function() {
                Notification.clearAll();
            });
        };

        var calcularScreen = function() {
            var widthScreen = parseInt(window.innerWidth);
            if (widthScreen <= 400) {
                vm.Screen = ["col-xs-12"];
            } else if (widthScreen >= 401 && widthScreen <= 520) {
                vm.Screen = ["col-xs-offset-1", "col-xs-10"];
            } else if (widthScreen >= 521 && widthScreen <= 767) {
                vm.Screen = ["col-xs-offset-2", "col-xs-8"];
            } else if (widthScreen >= 768 && widthScreen <= 890) {
                vm.Screen = ["col-xs-offset-1", "col-xs-10"];
            } else if (widthScreen >= 891 && widthScreen <= 1100) {
                vm.Screen = ["col-xs-offset-2", "col-xs-8"];
            } else if (widthScreen >= 1101 && widthScreen <= 1360) {
                vm.Screen = ["col-xs-offset-3", "col-xs-6"];
            } else if (widthScreen >= 1361) {
                vm.Screen = ["col-xs-offset-4", "col-xs-4"];
            }
        };
    }
})();

function getFecha(numeroFecha) {
    var d = new Date(numeroFecha);
    var dia = d.getDate();
    var anio = d.getFullYear();
    var mes = parseInt(d.getMonth()) + 1;

    if (dia < 10) {
        dia = "0" + dia;
    }
    if (mes < 10) {
        mes = "0" + mes;
    }

    return anio + "/" + mes + '/' + dia;
}

function getHora(numeroFecha) {
    var date = new Date(numeroFecha);

    var h = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();

    if (h < 10) { h = "0" + h;}
    if (m < 10) {m = "0" + m;}
    if (s < 10) {s = "0" + s;}
    
    return h + ':' + m;
}

function getFechayHora(Fecha) {
    var d = Fecha.split('T');
    var f = d[0];
    var h = d[1].split('.')[0];
    return f.replace(/-/g, '/') + " " + h;
}
