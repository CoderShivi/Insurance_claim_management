sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/model/json/JSONModel",
"sap/m/MessageToast",
"sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
"use strict";

return Controller.extend("claimsure.app.controller.Payout", {

    // =========================================================
    // INIT
    // =========================================================

    onInit: function () {

        var oPayoutModel = new JSONModel({

            summary: {
                totalCount: 0,
                totalAmount: 0,
                pending: 0,
                processing: 0,
                processed: 0,
                failed: 0,
                averageAmount: 0,
                highestAmount: 0,
                processedAmount: 0,
                failedAmount: 0
            },

            health: {
                percentage: 0,
                percentageText: "0%",
                state: "None",
                text: "No Data",
                detail: "No payout transactions available"
            },

            transactions: [],
            filteredTransactions: [],

            filter: {
                status: "ALL",
                search: ""
            },

            selectedPayout: {
                payoutNumber: "",
                amount: 0,
                status: "",
                statusState: "None",
                claimDisplay: "",
                processedByDisplay: ""
            }
        });

        this.getView().setModel(oPayoutModel, "payout");

        this._claimMap = {};
        this._customerMap = {};
        this._employeeMap = {};

        this._loadPayouts();
    },


    // =========================================================
    // LOAD PAYOUT + CLAIM + CUSTOMER + EMPLOYEE DATA
    // =========================================================

    _loadPayouts: function () {

        var oPayoutODataModel =
            this.getOwnerComponent().getModel("payout");

        var oInsuranceODataModel =
            this.getOwnerComponent().getModel();

        var oAdminODataModel =
            this.getOwnerComponent().getModel("admin");


        if (!oPayoutODataModel) {
            MessageBox.error(
                "Payout OData model is not available."
            );
            return;
        }

        if (!oInsuranceODataModel) {
            MessageBox.error(
                "Insurance OData model is not available."
            );
            return;
        }

        if (!oAdminODataModel) {
            MessageBox.error(
                "Admin OData model is not available."
            );
            return;
        }


        // =====================================================
        // CREATE LIST BINDINGS
        // =====================================================

        var oPayoutBinding =
            oPayoutODataModel.bindList("/Payouts");

        var oClaimBinding =
            oInsuranceODataModel.bindList("/Claims");

        var oCustomerBinding =
            oAdminODataModel.bindList("/Customers");

        var oEmployeeBinding =
            oAdminODataModel.bindList("/Employees");


        // =====================================================
        // LOAD ALL DATA
        // =====================================================

        Promise.all([

            oPayoutBinding.requestContexts(),

            oClaimBinding.requestContexts().catch(function (e) {
                console.warn(
                    "Claims not available:",
                    e
                );
                return [];
            }),

            oCustomerBinding.requestContexts().catch(function (e) {
                console.warn(
                    "Customers not available:",
                    e
                );
                return [];
            }),

            oEmployeeBinding.requestContexts().catch(function (e) {
                console.warn(
                    "Employees not available:",
                    e
                );
                return [];
            })

        ]).then(function (aResults) {


            var aPayouts =
                aResults[0].map(function (oContext) {
                    return oContext.getObject();
                });


            var aClaims =
                aResults[1].map(function (oContext) {
                    return oContext.getObject();
                });


            var aCustomers =
                aResults[2].map(function (oContext) {
                    return oContext.getObject();
                });


            var aEmployees =
                aResults[3].map(function (oContext) {
                    return oContext.getObject();
                });


            // =================================================
            // DEBUG
            // =================================================

            console.log("PAYOUTS:", aPayouts);
            console.log("CLAIMS:", aClaims);
            console.log("CUSTOMERS:", aCustomers);
            console.log("EMPLOYEES:", aEmployees);


            // =================================================
            // CLAIM MAP
            // =================================================

            this._claimMap = {};

            aClaims.forEach(function (oClaim) {

                if (oClaim.ID) {

                    this._claimMap[
                        String(oClaim.ID).trim()
                    ] = oClaim;
                }

                if (oClaim.claimNumber) {

                    this._claimMap[
                        String(oClaim.claimNumber).trim()
                    ] = oClaim;
                }

            }.bind(this));


            // =================================================
            // CUSTOMER MAP
            // =================================================

            this._customerMap = {};

            aCustomers.forEach(function (oCustomer) {

                if (oCustomer.ID) {

                    this._customerMap[
                        String(oCustomer.ID).trim()
                    ] = oCustomer;
                }

                if (oCustomer.customerNumber) {

                    this._customerMap[
                        String(oCustomer.customerNumber).trim()
                    ] = oCustomer;
                }

            }.bind(this));


            // =================================================
            // EMPLOYEE MAP
            // =================================================

            this._employeeMap = {};

            aEmployees.forEach(function (oEmployee) {

                if (oEmployee.ID) {

                    this._employeeMap[
                        String(oEmployee.ID).trim()
                    ] = oEmployee;
                }

                if (oEmployee.employeeNumber) {

                    this._employeeMap[
                        String(oEmployee.employeeNumber).trim()
                    ] = oEmployee;
                }

            }.bind(this));


            console.log(
                "Claim Map:",
                this._claimMap
            );

            console.log(
                "Customer Map:",
                this._customerMap
            );

            console.log(
                "Employee Map:",
                this._employeeMap
            );


            // =================================================
            // PREPARE PAYOUT DATA
            // =================================================

            this._preparePayoutData(aPayouts);

        }.bind(this)).catch(function (oError) {

            console.error(
                "Error loading Payouts:",
                oError
            );

            MessageBox.error(
                "Failed to load payout data."
            );
        });
    },


    // =========================================================
    // PREPARE DATA
    // =========================================================

    _preparePayoutData: function (aPayouts) {

        var oViewModel =
            this.getView().getModel("payout");


        var oSummary = {

            totalCount: aPayouts.length,

            totalAmount: 0,

            pending: 0,

            processing: 0,

            processed: 0,

            failed: 0,

            averageAmount: 0,

            highestAmount: 0,

            processedAmount: 0,

            failedAmount: 0
        };


        // =====================================================
        // CALCULATE SUMMARY
        // =====================================================

        aPayouts.forEach(function (oPayout) {

            var nAmount =
                Number(oPayout.amount || 0);

            var sStatus =
                oPayout.status || "Pending";


            oSummary.totalAmount += nAmount;


            if (
                nAmount >
                oSummary.highestAmount
            ) {

                oSummary.highestAmount =
                    nAmount;
            }


            switch (sStatus) {

                case "Pending":

                    oSummary.pending++;

                    break;


                case "Processing":

                    oSummary.processing++;

                    break;


                case "Processed":

                    oSummary.processed++;

                    oSummary.processedAmount +=
                        nAmount;

                    break;


                case "Failed":

                    oSummary.failed++;

                    oSummary.failedAmount +=
                        nAmount;

                    break;
            }

        });


        if (oSummary.totalCount > 0) {

            oSummary.averageAmount =
                oSummary.totalAmount /
                oSummary.totalCount;
        }


        // =====================================================
        // HEALTH
        // =====================================================

        var oHealth =
            this._calculateHealth(oSummary);


        // =====================================================
        // TRANSACTIONS
        // =====================================================

        var aTransactions =
            aPayouts.map(function (oPayout) {

                var oTransaction =
                    Object.assign({}, oPayout);


                // Status

                oTransaction.statusState =
                    this.formatStatusState(
                        oPayout.status
                    );


                // Customer name

                oTransaction.claimDisplay =
                    this._getClaimantName(
                        oPayout
                    );


                // Employee name

                oTransaction.processedByDisplay =
                    this._getProcessedByDisplay(
                        oPayout
                    );


                return oTransaction;

            }.bind(this));


        // =====================================================
        // SET MODEL DATA
        // =====================================================

        oViewModel.setProperty(
            "/summary",
            oSummary
        );


        oViewModel.setProperty(
            "/health",
            oHealth
        );


        oViewModel.setProperty(
            "/transactions",
            aTransactions
        );


        this._applyFilters();
    },


    // =========================================================
    // PAYOUT -> CLAIM -> CUSTOMER NAME
    // =========================================================

    _getClaimantName: function (oPayout) {

        if (!oPayout) {
            return "";
        }


        var sClaimId =
            oPayout.claim_ID ||
            oPayout.claimId ||
            oPayout.claim;


        if (!sClaimId) {

            return "";
        }


        sClaimId =
            String(sClaimId).trim();


        // =====================================================
        // FIND CLAIM
        // =====================================================

        var oClaim =
            this._claimMap[sClaimId];


        if (!oClaim) {

            console.warn(
                "Claim not found for ID:",
                sClaimId
            );

            return "";
        }


        // =====================================================
        // FIND CUSTOMER
        // =====================================================

        var sCustomerId =
            oClaim.customer_ID ||
            oClaim.customerId ||
            oClaim.customer;


        if (!sCustomerId) {

            console.warn(
                "Customer ID not available for claim:",
                sClaimId
            );

            return "";
        }


        sCustomerId =
            String(sCustomerId).trim();


        var oCustomer =
            this._customerMap[sCustomerId];


        if (!oCustomer) {

            console.warn(
                "Customer not found for ID:",
                sCustomerId
            );

            return "";
        }


        // =====================================================
        // CUSTOMER FULL NAME
        // =====================================================

        var sFirstName =
            oCustomer.firstName || "";

        var sLastName =
            oCustomer.lastName || "";


        return (
            sFirstName +
            " " +
            sLastName
        ).trim();
    },


    // =========================================================
    // PAYOUT -> EMPLOYEE NAME
    // =========================================================

    _getProcessedByDisplay: function (oPayout) {

        if (!oPayout) {
            return "";
        }


        var sEmployeeId =
            oPayout.processedBy_ID ||
            oPayout.processedById ||
            oPayout.processedBy;


        if (!sEmployeeId) {

            return "";
        }


        sEmployeeId =
            String(sEmployeeId).trim();


        var oEmployee =
            this._employeeMap[sEmployeeId];


        if (!oEmployee) {

            console.warn(
                "Employee not found for ID:",
                sEmployeeId
            );

            return "";
        }


        // =====================================================
        // EMPLOYEE FULL NAME
        // =====================================================

        var sFirstName =
            oEmployee.firstName || "";

        var sLastName =
            oEmployee.lastName || "";


        return (
            sFirstName +
            " " +
            sLastName
        ).trim();
    },


    // =========================================================
    // HEALTH
    // =========================================================

    _calculateHealth: function (oSummary) {

        var nTotal =
            oSummary.totalCount;


        if (nTotal === 0) {

            return {

                percentage: 0,

                percentageText: "0%",

                state: "None",

                text: "No Data",

                detail:
                    "No payout transactions available"
            };
        }


        var nPercentage =
            Math.round(
                (oSummary.processed / nTotal) * 100
            );


        if (nPercentage >= 90) {

            return {

                percentage: nPercentage,

                percentageText:
                    nPercentage + "%",

                state: "Success",

                text: "Healthy",

                detail:
                    "Settlement processing is operating normally"
            };
        }


        if (nPercentage >= 70) {

            return {

                percentage: nPercentage,

                percentageText:
                    nPercentage + "%",

                state: "Warning",

                text: "Needs Attention",

                detail:
                    "Some payouts require operational monitoring"
            };
        }


        return {

            percentage: nPercentage,

            percentageText:
                nPercentage + "%",

            state: "Error",

            text: "Critical",

            detail:
                "A significant number of payouts require attention"
        };
    },


    // =========================================================
    // FILTERS
    // =========================================================

    _applyFilters: function () {

        var oModel =
            this.getView().getModel("payout");


        var aTransactions =
            oModel.getProperty(
                "/transactions"
            ) || [];


        var sSearch =
            (
                oModel.getProperty(
                    "/filter/search"
                ) || ""
            ).toLowerCase();


        var sStatus =
            oModel.getProperty(
                "/filter/status"
            ) || "ALL";


        var aFiltered =
            aTransactions.filter(
                function (oPayout) {


                    var bSearchMatch =
                        !sSearch ||
                        String(
                            oPayout.payoutNumber || ""
                        )
                        .toLowerCase()
                        .includes(sSearch);


                    var bStatusMatch =
                        sStatus === "ALL" ||
                        oPayout.status === sStatus;


                    return (
                        bSearchMatch &&
                        bStatusMatch
                    );

                }
            );


        oModel.setProperty(
            "/filteredTransactions",
            aFiltered
        );
    },


    // =========================================================
    // SEARCH
    // =========================================================

    onSearch: function (oEvent) {

        var sValue =
            oEvent.getParameter(
                "newValue"
            ) || "";


        this.getView()
            .getModel("payout")
            .setProperty(
                "/filter/search",
                sValue
            );


        this._applyFilters();
    },


    // =========================================================
    // STATUS FILTER
    // =========================================================

    onStatusFilter: function (oEvent) {

        var sKey =
            oEvent.getParameter(
                "selectedItem"
            ).getKey();


        this.getView()
            .getModel("payout")
            .setProperty(
                "/filter/status",
                sKey
            );


        this._applyFilters();
    },


    // =========================================================
    // CLEAR FILTERS
    // =========================================================

    onClearFilters: function () {

        var oModel =
            this.getView()
                .getModel("payout");


        oModel.setProperty(
            "/filter/status",
            "ALL"
        );


        oModel.setProperty(
            "/filter/search",
            ""
        );


        this._applyFilters();


        MessageToast.show(
            "Filters cleared."
        );
    },


    // =========================================================
    // VIEW PAYOUT
    // =========================================================

    onViewPayout: function (oEvent) {

        var oContext =
            oEvent.getSource()
                .getBindingContext("payout");


        if (!oContext) {

            MessageBox.error(
                "Unable to load payout details."
            );

            return;
        }


        var oPayout =
            oContext.getObject();


        this._openPayoutObject(
            oPayout
        );
    },


    // =========================================================
    // OPEN PAYOUT DETAILS
    // =========================================================

    _openPayoutObject: function (oPayout) {

        var oModel =
            this.getView()
                .getModel("payout");


        var oSelectedPayout =
            Object.assign(
                {},
                oPayout
            );


        oSelectedPayout.statusState =
            this.formatStatusState(
                oPayout.status
            );


        oSelectedPayout.claimDisplay =
            this._getClaimantName(
                oPayout
            );


        oSelectedPayout.processedByDisplay =
            this._getProcessedByDisplay(
                oPayout
            );


        oModel.setProperty(
            "/selectedPayout",
            oSelectedPayout
        );


        this.byId(
            "payoutDetailsDialog"
        ).open();
    },


    // =========================================================
    // REFRESH
    // =========================================================

    onRefresh: function () {

        this._loadPayouts();

        MessageToast.show(
            "Settlement data refreshed."
        );
    },


    // =========================================================
    // CLOSE DETAILS
    // =========================================================

    onCloseDetails: function () {

        this.byId(
            "payoutDetailsDialog"
        ).close();
    },


    // =========================================================
    // FORMAT AMOUNT
    // =========================================================

    formatAmount: function (nAmount) {

        nAmount =
            Number(nAmount || 0);


        return "₹" +
            nAmount.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    },


    // =========================================================
    // FORMAT STATUS
    // =========================================================

    formatStatusState: function (sStatus) {

        switch (sStatus) {

            case "Pending":
                return "Warning";

            case "Processing":
                return "Information";

            case "Processed":
                return "Success";

            case "Failed":
                return "Error";

            default:
                return "None";
        }
    },
    onLifecycleStatusPress: function (oEvent) {

    var oButton = oEvent.getSource();

    var sStatus = oButton
        .getCustomData()[0]
        .getValue();

    var oModel = this.getView().getModel("payout");

    oModel.setProperty("/filter/status", sStatus);

    this._applyFilters();

    MessageToast.show(
        sStatus + " settlements displayed."
    );
},

});


});
