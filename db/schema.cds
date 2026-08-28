namespace claimsure;
using { cuid } from '@sap/cds/common';
entity Customers : cuid {
 
    customerNumber : String(30) @mandatory;
 
    firstName : String(100) @mandatory;

    lastName  : String(100) @mandatory;
 
    email   : String(150);

    phone   : String(30);

    address : String(500);
 
    status : String(20) enum {

        Active;

        Inactive;

        Suspended;

    } default 'Active';
 
}
 
 
entity ClaimTypes : cuid {
 
    code : String(30) @mandatory;
 
    name : String(100) @mandatory;
 
    description : String(500);
 
    category : String(30) enum {

        Vehicle;

        Health;

        Property;

    };
 
    active : Boolean default true;
 
}
 
 
entity Employees : cuid {
 
    employeeNumber : String(30) @mandatory;
 
    firstName : String(100) @mandatory;

    lastName  : String(100) @mandatory;
 
    email      : String(150) @mandatory;

    department : String(100);
 
    role : String(30) enum {

        ClaimsAgent;

        Investigator;

        ClaimsManager;

        FinanceOfficer;

        Admin;

    };
 
    active : Boolean default true;
 
}

 
entity Policies : cuid {
 
    policyNumber : String(50) @mandatory;
 
    customer : Association to Customers @mandatory;
 
    claimType : Association to ClaimTypes @mandatory;
 
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
 
    customer : Association to Customers @mandatory;
 
    policy : Association to Policies @mandatory;
 
    claimType : Association to ClaimTypes @mandatory;
 
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
 
    assignedAgent : Association to Employees;
 
}
 
 
entity ClaimDocuments : cuid {
 
    claim : Association to Claims @mandatory;
 
    documentType : String(50);
 
    fileName : String(255);
 
    mediaType : String(100);
 
    content : LargeBinary

        @Core.MediaType: mediaType;
 
}
 

 
entity FraudRiskScores : cuid {
 
    claim : Association to Claims @mandatory;
 
    riskScore : Decimal(5,2) @mandatory;
 
    riskLevel : String(20) enum {

        Low;

        Medium;

        High;

        Critical;

    };
 
}
 
 
entity Investigations : cuid {
 
    investigationNumber : String(50) @mandatory;
 
    claim : Association to Claims @mandatory;
 
    investigator : Association to Employees @mandatory;
 
    status : String(30) enum {

        Assigned;

        InProgress;

        Completed;

    } default 'Assigned';
 
    findings : String(1000);
 
}
 
 
entity Approvals : cuid {
 
    approvalNumber : String(50);
 
    claim : Association to Claims @mandatory;
 
    approver : Association to Employees;
 
    approvalLevel : String(30) enum {

        ClaimsAgent;

        ClaimsManager;

        FinanceOfficer;

    };
 
    decision : String(20) enum {

        Pending;

        Approved;

        Rejected;

    } default 'Pending';
 
    comments : String(500);
 
}
 
 
entity Payouts : cuid {
 
    payoutNumber : String(50) @mandatory;
 
    claim : Association to Claims @mandatory;
 
    amount : Decimal(15,2) @mandatory;
 
    status : String(30) enum {

        Pending;

        Processing;

        Processed;

        Failed;

    } default 'Pending';
 
    processedBy : Association to Employees;
 
}
 
 
entity SLARules : cuid {
 
    ruleName : String(100) @mandatory;
 
    claimType : Association to ClaimTypes @mandatory;
 
    resolutionHours : Integer @mandatory;
 
}
 
 
entity AlertLog : cuid {
 
    claim : Association to Claims;
 
    recipient : Association to Employees;
 
    alertType : String(40) enum {

        HighFraudRisk;

        InvestigationRequired;

        ApprovalPending;

        SLABreached;

        PayoutSuccess;

        PayoutFailed;

    };
 
    message : String(500);
 
    status : String(20) enum {

        Created;

        Sent;

        Read;

    } default 'Created';
 
}
 