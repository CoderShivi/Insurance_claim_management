using { claimsure as db } from '../db/schema';

service MyService {

    entity Customers as projection on db.Customers;

    entity ClaimTypes as projection on db.ClaimTypes;

    entity Employees as projection on db.Employees;

}

service Investigation {
 entity FraudRiskScores as projection on db.FraudRiskScores;
 entity Investigations as projection on db.Investigations;
 entity Approvals as projection on db.Approvals;
    
}

@impl: 'srv/payout.js'
service PayoutService {

    entity Payouts  as projection on db.Payouts;
    entity SLARules as projection on db.SLARules;
    entity AlertLog as projection on db.AlertLog;

    // PAYOUT ACTIONS

    action createPayout(
        claimID : UUID,
        amount : Decimal(15,2)
    ) returns Payouts;

    action processPayout(
        payoutID : UUID
    ) returns Payouts;

    // SLA FUNCTION

    function calculateSLAStatus(
        claimID : UUID
    ) returns String;

    // ALERT ACTIONS

    action createAlert(
        claimID : UUID,
        recipientID : UUID,
        alertType : String(40),
        message : String(500)
    ) returns AlertLog;

    action markAsRead(
        alertID : UUID
    ) returns AlertLog;

}