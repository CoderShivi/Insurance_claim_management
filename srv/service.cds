using claimsure as cl from '../db/schema';

service InsuranceService{
    entity Policies as projection on cl.Policies;
    entity Claims as projection on cl.Claims;
    entity ClaimDocuments as projection on cl.ClaimDocuments;

    //Policies
    action renewPolicy(policyID : UUID) returns Policies;
    action cancelPolicy(policyID : UUID) returns Policies;

    function getPolicyStatus(policyID : UUID) returns String;
    function getPolicyClaimsCount(policyID : UUID) returns Integer;

    //Claims
    action submitClaim(claimID : UUID) returns Claims;
    action approveClaim(claimID : UUID) returns Claims;
    action rejectClaim(claimID : UUID) returns Claims;

    function getClaimStatus(claimID : UUID) returns String;
    function getClaimAmount(claimID : UUID) returns Decimal(15,2);
    function getClaimDocumentsCount(claimID : UUID) returns Integer;

    //ClaimDocuments
    action deleteDocument(documentID : UUID) returns Boolean;
    function getDocumentInfo(documentID : UUID) returns String;

}