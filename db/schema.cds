namespace claimsure;
 
using {  cuid } from '@sap/cds/common';
 
 
entity Policies : cuid {
 
    policyNumber : String(50) @mandatory;
  
    coverageLimit : Decimal(15,2) @mandatory;
 
    premiumAmount : Decimal(15,2);
 
    startDate : Date @mandatory;
 
    endDate : Date @mandatory;
 
    status : String(20) enum {Active;
    Expired;
    Cancelled;
    Suspended;
    } default 'Active';

}
 
 
entity Claims : cuid {
 
    claimNumber : String(50) @mandatory;
 
    incidentDate : Date @mandatory;
 
    reportedDate : Timestamp default $now;
 
    incidentLocation : String(300);
 
    description : LargeString;
 
    claimedAmount : Decimal(15,2) @mandatory;
 
    approvedAmount : Decimal(15,2);
 
 
    status : String(30) enum {
    Draft;
    Submitted;
    UnderReview;
    InvestigationRequired;
    PendingApproval;
    Approved;
    Rejected;
    PayoutProcessing;
    Paid;
    Closed;
    } default 'Draft';
 
    priority : String(20) enum {Low;
    Medium;
    High;
    Critical;
    } default 'Medium';
 
 
    
}
 
 
entity ClaimDocuments : cuid {
 
    
 
    documentType : String(40) enum {
        Photo;

        PoliceReport;

        MedicalReport;

        Invoice;

        RepairEstimate;

        IdentityProof;

        Other;

    };
 
    fileName : String(255);
 
    mediaType : String(100);
 
    content : LargeBinary @Core.MediaType: mediaType;
 
    uploadedAt : Timestamp default $now;

}
 