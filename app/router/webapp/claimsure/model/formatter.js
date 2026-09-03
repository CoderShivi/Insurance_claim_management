sap.ui.define([], function () {
    "use strict";

    function firstTruthy(aValues) {
        for (var i = 0; i < aValues.length; i++) {
            if (aValues[i] !== undefined && aValues[i] !== null && aValues[i] !== "") {
                return aValues[i];
            }
        }
        return null;
    }

    return {
        // Resolves a foreign-key ID to a display name using a { ID: name } lookup
        // map (see Component.js "lookups" model). Used with multi-part bindings, e.g.:
        // parts: [{path:'customer_ID'}, {path:'lookups>/customers'}], formatter: '.formatter.idToName'
        // Falls back to the raw ID (or a dash) if the map hasn't loaded yet or has no entry.
        idToName: function (sId, mMap) {
            if (!sId) return "\u2014";
            if (mMap && mMap[sId]) return mMap[sId];
            return sId;
        },

        currency: function (value) {
            if (value === undefined || value === null || value === "") {
                return "";
            }
            var fValue = Number(value);
            if (isNaN(fValue)) {
                return "";
            }
            return fValue.toFixed(2);
        },

        shortDate: function (value) {
            if (!value) return "";
            var oDate = (value instanceof Date) ? value : new Date(value);
            if (isNaN(oDate.getTime())) return value;
            return oDate.toLocaleDateString();
        },

        // Tries several common shapes for a related Customer:
        // expanded object with firstName/lastName, a flat name field,
        // or a raw foreign key - shows whichever actually has data.
        customerDisplay: function (oRow) {
            if (!oRow) return "\u2014";

            var oCustomer = oRow.customer || oRow.Customer;
            if (oCustomer && (oCustomer.firstName || oCustomer.lastName)) {
                return [oCustomer.firstName, oCustomer.lastName].filter(Boolean).join(" ");
            }
            if (oCustomer && oCustomer.name) {
                return oCustomer.name;
            }

            var sFlat = firstTruthy([
                oRow.customerName,
                oRow.CustomerName
            ]);
            if (sFlat) return sFlat;

            var sId = firstTruthy([
                oRow.customerID,
                oRow.customer_ID,
                oRow.CustomerID
            ]);
            return sId ? ("Customer " + sId) : "\u2014";
        },

        // Same pattern for the related ClaimType.
        claimTypeDisplay: function (oRow) {
            if (!oRow) return "\u2014";

            var oType = oRow.claimType || oRow.ClaimType;
            if (oType && oType.name) {
                return oType.name;
            }

            var sFlat = firstTruthy([
                oRow.claimTypeName,
                oRow.ClaimTypeName
            ]);
            if (sFlat) return sFlat;

            var sId = firstTruthy([
                oRow.claimTypeID,
                oRow.claimType_ID,
                oRow.ClaimTypeID,
                oRow.claimTypeCode
            ]);
            return sId ? sId : "\u2014";
        },

        // Same pattern for the related Policy. Policy nav property is not expanded
        // (unconfirmed on the insuranceService Claims entity), so this mainly relies
        // on a flat policyNumber field or the raw foreign key.
        policyDisplay: function (oRow) {
            if (!oRow) return "\u2014";

            var oPolicy = oRow.policy || oRow.Policy;
            if (oPolicy && oPolicy.policyNumber) {
                return oPolicy.policyNumber;
            }

            var sFlat = firstTruthy([
                oRow.policyNumber,
                oRow.PolicyNumber
            ]);
            if (sFlat) return sFlat;

            var sId = firstTruthy([
                oRow.policyID,
                oRow.policy_ID,
                oRow.PolicyID
            ]);
            return sId ? sId : "\u2014";
        },

        statusState: function (status) {
            switch (status) {
                case "Approved":
                case "Paid":
                case "Active":
                    return "Success";
                case "Rejected":
                case "Cancelled":
                    return "Error";
                case "PendingApproval":
                case "UnderReview":
                case "InvestigationRequired":
                    return "Warning";
                case "Draft":
                case "Submitted":
                default:
                    return "None";
            }
        },

        statusIcon: function (status) {
            switch (status) {
                case "Approved":
                case "Paid":
                    return "sap-icon://accept";
                case "Rejected":
                    return "sap-icon://decline";
                case "PendingApproval":
                case "UnderReview":
                    return "sap-icon://pending";
                default:
                    return "sap-icon://document";
            }
        },

        riskState: function (riskLevel) {
            switch (riskLevel) {
                case "High":
                    return "Error";
                case "Medium":
                    return "Warning";
                case "Low":
                    return "Success";
                default:
                    return "None";
            }
        },

        canSubmit: function (status) {
            return status === "Draft";
        },

        canApproveReject: function (status) {
            return status === "PendingApproval" || status === "UnderReview";
        },

        canRenew: function (status) {
            return status === "Active" || status === "Expired";
        },

        canCancel: function (status) {
            return status === "Active";
        }
    };
});