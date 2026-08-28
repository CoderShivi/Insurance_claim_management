using { demo as db  } from '../db/schema';
 
 
service myService {
 
    entity Customers as projection on db.Customers;
    entity Policies as projection on db.Policies;
 
}