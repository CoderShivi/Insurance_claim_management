using { claimsure as db } from '../db/schema';

<<<<<<< HEAD
service MainService {
=======
service MyService {
>>>>>>> main

    entity Customers as projection on db.Customers;

    entity ClaimTypes as projection on db.ClaimTypes;

    entity Employees as projection on db.Employees;

}