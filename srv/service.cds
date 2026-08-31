using { claimsure as db  } from '../db/schema';
 
 
service Investigation {
 
 entity FraudRiskScores as projection on db.FraudRiskScores;
 entity Investigations as projection on db.Investigations;
 entity Approvals as projection on db.Approvals;
    
 
}