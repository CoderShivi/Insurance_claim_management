namespace claimsure;
 
using { cuid } from '@sap/cds/common';
 
entity Policies : cuid {
 
    policyNumber : String(50) @mandatory;
 
    coverageLimit : Decimal(15,2) @mandatory;
 
    startDate : Date;
 
    endDate : Date;
 
    status : String(20) enum {

        Active;

        Expired;

        Cancelled;

    } default 'Active';
 
}
 
 
entity Claims : cuid {
 
    claimNumber : String(50) @mandatory;
 
    incidentDate : Date;
 
    description : String(500);
 
    claimedAmount : Decimal(15,2) @mandatory;
 
    status : String(30) enum {

        Draft;

        Submitted;

        UnderReview;

        InvestigationRequired;

        PendingApproval;

        Approved;

        Rejected;

        Paid;

    } default 'Draft';
 
 
}
 
 
entity ClaimDocuments : cuid {
 
 
    documentType : String(50);
 
    fileName : String(255);
 
    mediaType : String(100);
 
    content : LargeBinary

        @Core.MediaType: mediaType;
 
}
 