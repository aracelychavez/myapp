using {myapp.db as myapp} from '../db/data-model';

using { API_SALES_ORDER_SRV } from './external/API_SALES_ORDER_SRV.csn';

service CatalogService @(path : '/catalog')
@(requires: 'authenticated-user')
{
    entity Sales
      @(restrict: [{ grant: ['READ'],
                     to: 'Viewer'
                    ,where: 'region = $user.Region' 
                   },
                   { grant: ['WRITE'],
                     to: 'Admin' 
                   }
                  ])
      as select * from myapp.Sales
      actions {
        @(restrict: [{ to: 'Viewer' }])
        function largestOrder() returns String;
        @(restrict: [{ to: 'Admin' }])
        action boost();
      }
    ;

    function topSales
      @(restrict: [{ to: 'Viewer' }])
      (amount: Integer)
      returns many Sales;

    @readonly
    entity SalesOrders
      @(restrict: [{ to: 'Viewer' }])
      as projection on API_SALES_ORDER_SRV.A_SalesOrder {
          SalesOrder,
          SalesOrganization,
          DistributionChannel,
          SoldToParty,
          TotalNetAmount,
          TransactionCurrency
        };

    type userRoles { identified: Boolean; authenticated: Boolean; Viewer: Boolean; Admin: Boolean; };
    type userAttrs { Region: many String; };
    type user { user: String; locale: String; roles: userRoles; attrs: userAttrs; };
    function userInfo() returns user;
};
