<<<<<<< HEAD
using { claimsure as db } from '../db/schema';

service MyService {

    entity Customers as projection on db.Customers;

    entity ClaimTypes as projection on db.ClaimTypes;

    entity Employees as projection on db.Employees;

}
=======
using { claimsure as db  } from '../db/schema';
 
 
service Investigation {
 
 entity FraudRiskScores as projection on db.FraudRiskScores;
 entity Investigations as projection on db.Investigations;
 entity Approvals as projection on db.Approvals;
    
 
}
>>>>>>> c4acea335cdd5a384e3d8edb9e72521ef9f9fd20
