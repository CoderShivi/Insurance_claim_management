using { claimsure as db } from '../db/schema';

service MyService {

    entity Customers as projection on db.Customers;

    entity ClaimTypes as projection on db.ClaimTypes;

    entity Employees as projection on db.Employees;

}