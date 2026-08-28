namespace demo;
using { cuid  } from '@sap/cds/common';
 
 
entity Customers : cuid {
  name        : String(120)  @mandatory;
  email       : String(120);
  phone       : String(30);
  address     : String(200);
  policies    : Association to many Policies on policies.customer = $self;
}
 
entity Policies : cuid {
  policyNumber   : String(20)  @mandatory;
  customer       : Association to Customers @mandatory;   // FK side (N : 1)
  coverageLimit  : Decimal(15,2) @mandatory;
  status         : String(10) enum { Active; Expired; Cancelled } default 'Active';
  startDate      : Date @mandatory;
  endDate        : Date @mandatory;
}