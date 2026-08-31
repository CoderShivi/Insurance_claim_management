using claimsure as cl from '../db/schema';

service InsuranceService{
    entity Policies as projection on cl.Policies;
    entity Claims as projection on cl.Claims;
    entity ClaimDocuments as projection on cl.ClaimDocuments;
}