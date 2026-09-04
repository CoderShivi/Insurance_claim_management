sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "claimsure/app/model/formatter"
], function (
    Controller,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox,
    Fragment,
    formatter
) {
    "use strict";

    return Controller.extend(
        "claimsure.app.controller.Claims",
        {

            formatter: formatter,


            // ============================================================
            // INIT
            // ============================================================

            onInit: function () {

                var oTable = this.byId("claimsTable");

                if (!oTable) {
                    console.error(
                        "[Claims] claimsTable not found."
                    );
                    return;
                }

                var oBinding = oTable.getBinding("items");

                if (oBinding) {

                    oBinding.attachDataReceived(
                        function (oEvent) {

                            var oError =
                                oEvent.getParameter("error");

                            if (oError) {

                                console.error(
                                    "[Claims] Data load error:",
                                    oError
                                );

                                MessageToast.show(
                                    "Could not load claims. Check console for details."
                                );

                            } else {

                                console.log(
                                    "[Claims] Claims loaded:",
                                    oBinding
                                        .getCurrentContexts()
                                        .length
                                );
                            }
                        }
                    );
                }
            },


            // ============================================================
            // SEARCH
            // ============================================================

            onSearch: function (oEvent) {

                var sQuery = (
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("query") ||
                    ""
                ).trim();

                var oTable =
                    this.byId("claimsTable");

                if (!oTable) {
                    return;
                }

                var oBinding =
                    oTable.getBinding("items");

                if (!oBinding) {
                    return;
                }

                var aFilters =
                    this._getStatusFilter();

                if (sQuery) {

                    aFilters.push(
                        new Filter(
                            "claimNumber",
                            FilterOperator.Contains,
                            sQuery
                        )
                    );
                }

                oBinding.filter(aFilters);
            },


            // ============================================================
            // STATUS FILTER
            // ============================================================

            onStatusFilterChange: function () {

                var oTable =
                    this.byId("claimsTable");

                if (!oTable) {
                    return;
                }

                var oBinding =
                    oTable.getBinding("items");

                if (!oBinding) {
                    return;
                }

                oBinding.filter(
                    this._getStatusFilter()
                );
            },


            // ============================================================
            // GET STATUS FILTER
            // ============================================================

            _getStatusFilter: function () {

                var oComboBox =
                    this.byId("statusFilter");

                var aFilters = [];

                if (!oComboBox) {
                    return aFilters;
                }

                var oSelectedItem =
                    oComboBox.getSelectedItem();

                if (oSelectedItem) {

                    var sStatus =
                        oSelectedItem.getKey();

                    aFilters.push(
                        new Filter(
                            "status",
                            FilterOperator.EQ,
                            sStatus
                        )
                    );
                }

                return aFilters;
            },


            // ============================================================
            // OPEN CLAIM DETAIL
            // ============================================================

            onClaimPress: function (oEvent) {

                var oSource =
                    oEvent.getSource();

                var oCtx =
                    oSource.getBindingContext();

                if (!oCtx) {

                    console.error(
                        "[Claims] No binding context available."
                    );

                    MessageToast.show(
                        "Could not open this claim."
                    );

                    return;
                }

                var sClaimId =
                    oCtx.getProperty("ID");

                if (!sClaimId) {

                    console.error(
                        "[Claims] Cannot open claim: no ID",
                        oCtx.getObject()
                    );

                    MessageToast.show(
                        "Could not open this claim."
                    );

                    return;
                }

                console.log(
                    "[Claims] Opening claim:",
                    sClaimId
                );

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "claimDetail",
                        {
                            claimId: sClaimId
                        }
                    );
            },


            // ============================================================
            // GO FOR APPROVAL
            // ============================================================

            onGoForApproval: function (oEvent) {

                console.log(
                    "[Claims] Go for Approval button pressed"
                );

                var oButton =
                    oEvent.getSource();

                var oContext =
                    oButton.getBindingContext();

                if (!oContext) {

                    console.error(
                        "[Claims] No binding context on approval button."
                    );

                    MessageBox.error(
                        "Claim information is not available."
                    );

                    return;
                }


                // --------------------------------------------------------
                // Get claim information
                // --------------------------------------------------------

                var sClaimId =
                    oContext.getProperty("ID");

                var sClaimNumber =
                    oContext.getProperty("claimNumber");

                var sStatus =
                    oContext.getProperty("status");


                console.log(
                    "[Claims] Claim ID:",
                    sClaimId
                );

                console.log(
                    "[Claims] Claim Number:",
                    sClaimNumber
                );

                console.log(
                    "[Claims] Claim Status:",
                    sStatus
                );


                // --------------------------------------------------------
                // Validate Claim ID
                // --------------------------------------------------------

                if (!sClaimId) {

                    MessageBox.error(
                        "Claim ID not found."
                    );

                    return;
                }


                // --------------------------------------------------------
                // Validate Status
                // --------------------------------------------------------

                if (sStatus !== "Submitted") {

                    MessageToast.show(
                        "Only Submitted claims can be for approval."
                    );

                    return;
                }


                // --------------------------------------------------------
                // Confirmation
                // --------------------------------------------------------

                MessageBox.confirm(

                    "Do you want to send claim " +
                    sClaimNumber +
                    " for approval?",

                    {
                        title: "Go for Approval",

                        actions: [
                            MessageBox.Action.YES,
                            MessageBox.Action.NO
                        ],

                        onClose: function (sAction) {

                            if (
                                sAction !==
                                MessageBox.Action.YES
                            ) {
                                return;
                            }

                            this._submitClaimForApproval(
                                sClaimId,
                                sClaimNumber
                            );

                        }.bind(this)
                    }
                );
            },


            // ============================================================
            // SUBMIT CLAIM FOR APPROVAL
            // ============================================================

            _submitClaimForApproval: function (
                sClaimId,
                sClaimNumber
            ) {

                console.log(
                    "[Claims] Starting submitClaim action"
                );

                console.log(
                    "[Claims] Claim ID:",
                    sClaimId
                );


                // --------------------------------------------------------
                // Get OData V4 Model
                // --------------------------------------------------------

                var oModel =
                    this.getOwnerComponent()
                        .getModel();

                if (!oModel) {

                    console.error(
                        "[Claims] OData model not found."
                    );

                    MessageBox.error(
                        "OData model is not available."
                    );

                    return;
                }


                console.log(
                    "[Claims] OData model found."
                );


                // --------------------------------------------------------
                // Create OData V4 Action Binding
                //
                // CDS:
                //
                // action submitClaim(
                //     claimID : UUID
                // ) returns Claims;
                //
                // This is an UNBOUND action.
                // --------------------------------------------------------

                var oAction;

                try {

                    oAction =
                        oModel.bindContext(
                            "/submitClaim(...)"
                        );

                } catch (oError) {

                    console.error(
                        "[Claims] Could not create action binding:",
                        oError
                    );

                    MessageBox.error(
                        "Could not prepare claim approval request.\n\n" +
                        (
                            oError.message ||
                            "Unknown error"
                        )
                    );

                    return;
                }


                // --------------------------------------------------------
                // Set action parameter
                // --------------------------------------------------------

                try {

                    oAction.setParameter(
                        "claimID",
                        sClaimId
                    );

                } catch (oError) {

                    console.error(
                        "[Claims] Could not set claimID:",
                        oError
                    );

                    MessageBox.error(
                        "Could not prepare claim ID."
                    );

                    return;
                }


                console.log(
                    "[Claims] Action parameter claimID:",
                    sClaimId
                );


                // --------------------------------------------------------
                // Show progress message
                // --------------------------------------------------------

                MessageToast.show(
                    "Submitting " +
                    sClaimNumber +
                    " for approval..."
                );


                // --------------------------------------------------------
                // Execute CAP action
                // --------------------------------------------------------

                oAction.execute()

                    .then(
                        function (oResult) {

                            console.log(
                                "[Claims] submitClaim successful."
                            );

                            console.log(
                                "[Claims] Action result:",
                                oResult
                            );


                            // --------------------------------------------
                            // Success message
                            // --------------------------------------------

                            MessageToast.show(
                                "Claim " +
                                sClaimNumber +
                                " sent for approval."
                            );


                            // --------------------------------------------
                            // Refresh Claims table
                            // --------------------------------------------

                            var oTable =
                                this.byId(
                                    "claimsTable"
                                );

                            if (oTable) {

                                var oBinding =
                                    oTable.getBinding(
                                        "items"
                                    );

                                if (oBinding) {

                                    oBinding.refresh();

                                    console.log(
                                        "[Claims] Claims table refreshed."
                                    );
                                }
                            }

                        }.bind(this)
                    )

                    .catch(
                        function (oError) {

                            console.error(
                                "[Claims] submitClaim failed:",
                                oError
                            );

                            console.error(
                                "[Claims] Error message:",
                                oError &&
                                oError.message
                            );


                            var sErrorMessage =
                                "Could not submit claim for approval.";


                            if (
                                oError &&
                                oError.message
                            ) {

                                sErrorMessage +=
                                    "\n\n" +
                                    oError.message;
                            }


                            MessageBox.error(
                                sErrorMessage
                            );

                        }.bind(this)
                    );
            },


            // ============================================================
            // CREATE CLAIM DIALOG
            // ============================================================

            onCreateClaim: function () {

                var oView =
                    this.getView();

                if (!this._pCreateDialog) {

                    this._pCreateDialog =
                        Fragment.load({

                            id: oView.getId(),

                            name:
                                "claimsure.app.view.CreateClaimDialog",

                            controller: this

                        }).then(
                            function (oDialog) {

                                oView.addDependent(
                                    oDialog
                                );

                                return oDialog;
                            }
                        );
                }


                this._pCreateDialog.then(
                    function (oDialog) {

                        oDialog.open();

                    }
                );
            },


            // ============================================================
            // CANCEL CREATE CLAIM
            // ============================================================

            onCancelCreateClaim: function () {

                if (!this._pCreateDialog) {
                    return;
                }

                this._pCreateDialog.then(
                    function (oDialog) {

                        oDialog.close();

                    }
                );
            },


            // ============================================================
            // CREATE CLAIM
            // ============================================================

            onConfirmCreateClaim: function () {

                var oView =
                    this.getView();


                // --------------------------------------------------------
                // Get controls from fragment
                // --------------------------------------------------------

                var oCustomer =
                    sap.ui.core.Fragment.byId(
                        oView.getId(),
                        "ccCustomer"
                    );

                var oPolicy =
                    sap.ui.core.Fragment.byId(
                        oView.getId(),
                        "ccPolicy"
                    );

                var oClaimType =
                    sap.ui.core.Fragment.byId(
                        oView.getId(),
                        "ccClaimType"
                    );

                var oAmount =
                    sap.ui.core.Fragment.byId(
                        oView.getId(),
                        "ccAmount"
                    );

                var oDate =
                    sap.ui.core.Fragment.byId(
                        oView.getId(),
                        "ccDate"
                    );

                var oDesc =
                    sap.ui.core.Fragment.byId(
                        oView.getId(),
                        "ccDesc"
                    );


                // --------------------------------------------------------
                // Validate controls
                // --------------------------------------------------------

                if (
                    !oCustomer ||
                    !oPolicy ||
                    !oClaimType ||
                    !oAmount ||
                    !oDate ||
                    !oDesc
                ) {

                    MessageBox.error(
                        "Claim form controls could not be found."
                    );

                    return;
                }


                // --------------------------------------------------------
                // Read values
                // --------------------------------------------------------

                var sCustomerId =
                    oCustomer.getSelectedKey();

                var sPolicyId =
                    oPolicy.getSelectedKey();

                var sClaimTypeId =
                    oClaimType.getSelectedKey();

                var fAmount =
                    parseFloat(
                        oAmount.getValue()
                    );

                var sDate =
                    oDate.getValue();

                var sDescription =
                    oDesc.getValue() || "";


                // --------------------------------------------------------
                // Validation
                // --------------------------------------------------------

                if (
                    !sCustomerId ||
                    !sPolicyId ||
                    !sClaimTypeId ||
                    isNaN(fAmount) ||
                    fAmount <= 0 ||
                    !sDate
                ) {

                    MessageToast.show(
                        "Please fill in Customer, Policy, Claim Type, a positive Amount and Incident Date."
                    );

                    return;
                }


                // --------------------------------------------------------
                // Get OData model
                // --------------------------------------------------------

                var oModel =
                    this.getOwnerComponent()
                        .getModel();

                if (!oModel) {

                    MessageBox.error(
                        "OData model is not available."
                    );

                    return;
                }


                // --------------------------------------------------------
                // Create List Binding
                // --------------------------------------------------------

                var oListBinding =
                    oModel.bindList(
                        "/Claims"
                    );


                // --------------------------------------------------------
                // Create claim
                // --------------------------------------------------------

                var oContext =
                    oListBinding.create({

                        claimNumber:
                            "CLM-" +
                            Date.now(),

                        customer_ID:
                            sCustomerId,

                        policy_ID:
                            sPolicyId,

                        claimType_ID:
                            sClaimTypeId,

                        claimedAmount:
                            fAmount,

                        incidentDate:
                            sDate,

                        description:
                            sDescription,

                        status:
                            "Submitted"
                    });


                // --------------------------------------------------------
                // Wait for creation
                // --------------------------------------------------------

                oContext.created()

                    .then(
                        function () {

                            var sClaimId =
                                oContext.getProperty(
                                    "ID"
                                );


                            console.log(
                                "[Claims] Claim created:",
                                sClaimId
                            );


                            MessageToast.show(
                                "Claim created successfully."
                            );


                            // --------------------------------------------
                            // Close dialog
                            // --------------------------------------------

                            if (
                                this._pCreateDialog
                            ) {

                                this._pCreateDialog.then(
                                    function (oDialog) {

                                        oDialog.close();

                                    }
                                );
                            }


                            // --------------------------------------------
                            // Navigate to detail page
                            // --------------------------------------------

                            if (sClaimId) {

                                this.getOwnerComponent()
                                    .getRouter()
                                    .navTo(
                                        "claimDetail",
                                        {
                                            claimId:
                                                sClaimId
                                        }
                                    );
                            }

                        }.bind(this)
                    )

                    .catch(
                        function (oError) {

                            console.error(
                                "[Claims] Failed to create claim:",
                                oError
                            );


                            MessageBox.error(
                                "Could not create claim: " +
                                (
                                    oError.message ||
                                    "Check console for details."
                                )
                            );

                        }.bind(this)
                    );
            }

        }
    );
});