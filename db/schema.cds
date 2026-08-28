namespace claimsure;

using {cuid} from '@sap/cds/common';


entity Customers : cuid {

    customerNumber : String(30)  @mandatory;

    firstName      : String(100) @mandatory;
    lastName       : String(100) @mandatory;

    email          : String(150);
    phone          : String(30);

    address        : String(500);

    status         : String(20) enum {
        Active;
        Inactive;
        Suspended;
    } default 'Active';

}


entity ClaimTypes : cuid {

    code        : String(30)  @mandatory;

    name        : String(100) @mandatory;

    description : String(500);

    category    : String(30) enum {
        Auto;
        Health;
        Property;
    };

    active      : Boolean default true;


}


entity Employees : cuid {

    employeeNumber : String(30)  @mandatory;

    firstName      : String(100) @mandatory;
    lastName       : String(100) @mandatory;

    email          : String(150) @mandatory;

    department     : String(100);

    role           : String(30) enum {
        ClaimsAgent;
        Investigator;
        ClaimsManager;
        FinanceOfficer;
        Admin;
    };

    active         : Boolean default true;



}
