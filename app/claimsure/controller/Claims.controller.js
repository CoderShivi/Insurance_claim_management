sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "../model/formatter",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox,
    Fragment,
    formatter,
    JSONModel
) {

    "use strict";

    return Controller.extend("claimsure.app.controller.Claims", {

        formatter: formatter,

        onInit: function () {

            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.attachDataReceived(function (oEvent) {

                    if (oEvent.getParameter("error")) {
                        console.error("Error loading claims");
                        return;
                    }

                });
            }

            this.getOwnerComponent()
                .getRouter()
                .getRoute("claims")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        onKpiPendingApproval: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("claims", {
                    "?query": {
                        status: "PendingApproval,UnderReview"
                    }
                });
        },

        _onRouteMatched: function (oEvent) {

            var oQuery =
                oEvent.getParameter("arguments")["?query"] || {};

            this._applyStatusFromQuery(oQuery.status);
        },

        _applyStatusFromQuery: function (sStatus) {

            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");
            var oComboBox = this.byId("statusFilter");

            if (!oBinding) {
                return;
            }

            var sExistingSearch = this.byId("claimsSearch")
                ? this.byId("claimsSearch").getValue()
                : "";

            var aFilters = [];

            if (sExistingSearch) {

                aFilters.push(
                    new Filter(
                        "claimNumber",
                        FilterOperator.Contains,
                        sExistingSearch
                    )
                );
            }

            if (sStatus) {

                var aStatuses = sStatus.split(",");

                if (aStatuses.length > 1) {

                    aFilters.push(
                        new Filter({
                            filters: aStatuses.map(function (s) {

                                return new Filter(
                                    "status",
                                    FilterOperator.EQ,
                                    s
                                );

                            }),
                            and: false
                        })
                    );

                } else {

                    aFilters.push(
                        new Filter(
                            "status",
                            FilterOperator.EQ,
                            aStatuses[0]
                        )
                    );
                }

                if (oComboBox && aStatuses.length === 1) {

                    var oMatch = oComboBox.getItems().filter(
                        function (oItem) {
                            return oItem.getKey() === aStatuses[0];
                        }
                    )[0];

                    if (oMatch) {
                        oComboBox.setSelectedItem(oMatch);
                    }
                }

            } else if (oComboBox) {

                oComboBox.setSelectedKey(null);
            }

            oBinding.filter(aFilters);
        },

        onSearch: function (oEvent) {

            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");

            var sQuery =
                oEvent.getParameter("newValue") ||
                oEvent.getParameter("query") ||
                "";

            var aFilters = [];

            var oStatusFilter = this._getStatusFilter();

            if (oStatusFilter) {
                aFilters.push(oStatusFilter);
            }

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

        onStatusFilterChange: function () {

            var oTable = this.byId("claimsTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = [];

            var oStatusFilter = this._getStatusFilter();

            if (oStatusFilter) {
                aFilters.push(oStatusFilter);
            }

            var sQuery = this.byId("claimsSearch").getValue();

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

        _getStatusFilter: function () {

            var oComboBox = this.byId("statusFilter");

            var oItem = oComboBox.getSelectedItem();

            if (!oItem) {
                return null;
            }

            return new Filter(
                "status",
                FilterOperator.EQ,
                oItem.getKey()
            );
        },

        onClaimPress: function (oEvent) {

            var oContext =
                oEvent.getSource().getBindingContext();

            if (!oContext) {
                return;
            }

            var sClaimId =
                oContext.getProperty("ID");

            this.getOwnerComponent()
                .getRouter()
                .navTo("claimDetail", {
                    claimId: sClaimId
                });
        },

        onGoForApproval: function (oEvent) {

            var oButton = oEvent.getSource();

            var oContext =
                oButton.getBindingContext();

            if (!oContext) {

                MessageBox.error(
                    "Unable to read claim details."
                );

                return;
            }

            var sClaimId =
                oContext.getProperty("ID");

            var sClaimNumber =
                oContext.getProperty("claimNumber");

            var sStatus =
                oContext.getProperty("status");

            if (!sClaimId) {

                MessageBox.error(
                    "Claim ID is missing."
                );

                return;
            }

            if (sStatus !== "Submitted") {

                MessageBox.warning(
                    "Only submitted claims can be sent for approval."
                );

                return;
            }

            MessageBox.confirm(
                "Do you want to send claim " +
                sClaimNumber +
                " for approval?",
                {
                    title: "Go for Approval",

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    emphasizedAction:
                        MessageBox.Action.OK,

                    onClose: function (sAction) {

                        if (
                            sAction ===
                            MessageBox.Action.OK
                        ) {

                            this._submitClaimForApproval(
                                sClaimId,
                                sClaimNumber
                            );
                        }

                    }.bind(this)
                }
            );
        },

        _submitClaimForApproval: function (
            sClaimId,
            sClaimNumber
        ) {

            var oModel =
                this.getView().getModel();

            if (!oModel) {

                MessageBox.error(
                    "OData model is not available."
                );

                return;
            }

            var oAction =
                oModel.bindContext(
                    "/submitClaim(...)"
                );

            oAction.setParameter(
                "claimID",
                sClaimId
            );

            oAction.execute()

                .then(function () {

                    MessageToast.show(
                        "Claim " +
                        sClaimNumber +
                        " sent for approval."
                    );

                    var oTable =
                        this.byId("claimsTable");

                    var oBinding =
                        oTable.getBinding("items");

                    if (oBinding) {
                        oBinding.refresh();
                    }

                }.bind(this))

                .catch(function (oError) {

                    console.error(
                        "submitClaim error:",
                        oError
                    );

                    MessageBox.error(
                        oError.message ||
                        "Failed to send claim for approval."
                    );

                });
        },

        onCreateClaim: function () {

            if (!this._oCreateClaimDialog) {

                Fragment.load({
                    id: "createClaim",
                    name: "claimsure.app.view.CreateClaimDialog",
                    controller: this
                })

                    .then(function (oDialog) {

                        this._oCreateClaimDialog =
                            oDialog;

                        this.getView()
                            .addDependent(oDialog);

                        oDialog.open();

                    }.bind(this));

            } else {

                this._oCreateClaimDialog.open();
            }
        },

        onCancelCreateClaim: function () {

            if (this._oCreateClaimDialog) {
                this._oCreateClaimDialog.close();
            }

            this._resetCreateClaimForm();
        },

        onDocumentFileChange: function (oEvent) {

            var aFiles =
                oEvent.getParameter("files");

            this._oSelectedFile =
                (
                    aFiles &&
                    aFiles.length
                )
                    ? aFiles[0]
                    : null;
        },

        onConfirmCreateClaim: function () {

            var oDialog =
                this._oCreateClaimDialog;

            var oCustomer =
                Fragment.byId(
                    "createClaim",
                    "ccCustomer"
                );

            var oPolicy =
                Fragment.byId(
                    "createClaim",
                    "ccPolicy"
                );

            var oClaimType =
                Fragment.byId(
                    "createClaim",
                    "ccClaimType"
                );

            var oAmount =
                Fragment.byId(
                    "createClaim",
                    "ccAmount"
                );

            var oDate =
                Fragment.byId(
                    "createClaim",
                    "ccDate"
                );

            var oDesc =
                Fragment.byId(
                    "createClaim",
                    "ccDesc"
                );

            if (
                !oCustomer ||
                !oPolicy ||
                !oClaimType
            ) {

                MessageBox.error(
                    "Unable to find claim form controls."
                );

                return;
            }

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
                oDesc.getValue();

            if (
                !sCustomerId ||
                !sPolicyId ||
                !sClaimTypeId
            ) {

                MessageBox.warning(
                    "Please select customer, policy and claim type."
                );

                return;
            }

            if (!fAmount || fAmount <= 0) {

                MessageBox.warning(
                    "Please enter a valid claim amount."
                );

                return;
            }

            if (!sDate) {

                MessageBox.warning(
                    "Please enter the incident date."
                );

                return;
            }

            if (!this._oSelectedFile) {

                MessageBox.warning(
                    "Please attach a supporting document."
                );

                return;
            }

            var oModel =
                this.getView().getModel();

            if (!oModel) {

                MessageBox.error(
                    "OData model is not available."
                );

                return;
            }

            var oListBinding =
                oModel.bindList("/Claims");

            var oContext =
                oListBinding.create({

                    claimNumber:
                        "CLM-" + Date.now(),

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

            oContext.created()

                .then(function () {

                    var sClaimId =
                        oContext.getProperty("ID");

                    if (this._oSelectedFile) {

                        this._createAndUploadDocument(
                            sClaimId,
                            this._oSelectedFile
                        );
                    }

                    MessageToast.show(
                        "Claim created successfully."
                    );

                    oDialog.close();

                    this._resetCreateClaimForm();

                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "claimDetail",
                            {
                                claimId: sClaimId
                            }
                        );

                }.bind(this))

                .catch(function (oError) {

                    console.error(
                        "Create claim error:",
                        oError
                    );

                    MessageBox.error(
                        oError.message ||
                        "Failed to create claim."
                    );
                });
        },

        _createAndUploadDocument: function (
            sClaimId,
            oFile
        ) {

            var oModel =
                this.getView().getModel();

            var oDocBinding =
                oModel.bindList(
                    "/Claims(" +
                    sClaimId +
                    ")/documents"
                );

            var oDocContext =
                oDocBinding.create({

                    documentType:
                        "Supporting",

                    fileName:
                        oFile.name,

                    mediaType:
                        oFile.type ||
                        "application/octet-stream"
                });

            oDocContext.created()

                .then(function () {

                    var sDocId =
                        oDocContext.getProperty("ID");

                    this._uploadFileContent(
                        sClaimId,
                        sDocId,
                        oFile
                    );

                }.bind(this))

                .catch(function (oError) {

                    console.error(
                        "Create document error:",
                        oError
                    );

                    MessageBox.error(
                        "Claim was created, but the document record could not be saved."
                    );
                });
        },

        _uploadFileContent: function (
            sClaimId,
            sDocId,
            oFile
        ) {

            var oModel =
                this.getView().getModel();

            var sBaseUrl =
                oModel.getServiceUrl();

            var sUrl =
                sBaseUrl.replace(/\/$/, "") +
                "/Claims(" +
                sClaimId +
                ")/documents(" +
                sDocId +
                ")/content";

            fetch(
                sUrl,
                {
                    method: "HEAD",

                    headers: {
                        "X-CSRF-Token": "Fetch"
                    }
                }
            )

                .then(function (oResp) {

                    var sToken =
                        oResp.headers.get(
                            "X-CSRF-Token"
                        );

                    return fetch(
                        sUrl,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    oFile.type ||
                                    "application/octet-stream",

                                "X-CSRF-Token":
                                    sToken
                            },

                            body: oFile,

                            credentials: "include"
                        }
                    );
                })

                .then(function (oPutResp) {

                    if (oPutResp.ok) {

                        MessageToast.show(
                            "Document uploaded."
                        );

                    } else {

                        MessageBox.error(
                            "Failed to upload the document file."
                        );
                    }
                })

                .catch(function (oError) {

                    console.error(
                        "Upload error:",
                        oError
                    );

                    MessageBox.error(
                        "Failed to upload the document file."
                    );
                });
        },

        _resetCreateClaimForm: function () {

            var oFileUploader =
                Fragment.byId(
                    "createClaim",
                    "ccFile"
                );

            if (oFileUploader) {
                oFileUploader.clear();
            }

            this._oSelectedFile = null;
        },

        /* ========================================================= */
        /* AI CLAIM ANALYSIS                                        */
        /* ========================================================= */
        onAnalyzeClaim: function (oEvent) {

            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();

            if (!oContext) {
                MessageBox.error("Unable to read claim details.");
                return;
            }

            var sClaimId = oContext.getProperty("ID");
            var sClaimNumber = oContext.getProperty("claimNumber");

            if (!sClaimId) {
                MessageBox.error("Claim ID is missing.");
                return;
            }

            if (!this._oAIAnalysisDialog) {

                Fragment.load({
                    id: "aiAnalysis",
                    name: "claimsure.app.fragment.AIAnalysisDialog",
                    controller: this
                })
                    .then(function (oDialog) {

                        this._oAIAnalysisDialog = oDialog;

                        this.getView().addDependent(oDialog);

                        this._callAIAnalysis(
                            sClaimId,
                            sClaimNumber,
                            oContext
                        );

                    }.bind(this))
                    .catch(function (oError) {

                        console.error(
                            "AI fragment loading error:",
                            oError
                        );

                        MessageBox.error(
                            "Failed to load the AI analysis dialog. Check the browser console."
                        );
                    });

            } else {

                this._callAIAnalysis(
                    sClaimId,
                    sClaimNumber,
                    oContext
                );
            }
        },
        _callAIAnalysis: function (
            sClaimId,
            sClaimNumber,
            oClaimContext
        ) {

            var oModel = this.getView().getModel();

            if (!oModel) {
                MessageBox.error("OData model is not available.");
                return;
            }

            var fClaimAmount = Number(
                oClaimContext.getProperty("claimedAmount") || 0
            );

            var sStatus =
                oClaimContext.getProperty("status") || "";

            var oAIModel = new JSONModel({
                claimNumber: sClaimNumber,

                claimAmount:
                    fClaimAmount.toLocaleString("en-IN"),

                status: sStatus,

                statusState:
                    this._getStatusState(sStatus),

                riskLevel: "Loading...",
                riskState: "None",

                fraudScore: "Loading...",
                fraudState: "None",

                analysisHtml:
                    "<p>Analyzing claim...</p>"
            });

            this._oAIAnalysisDialog.setModel(
                oAIModel,
                "ai"
            );

            this._oAIAnalysisDialog.setBusy(true);
            this._oAIAnalysisDialog.open();

            var oAction =
                oModel.bindContext(
                    "/analyzeClaim(...)"
                );

            oAction.setParameter(
                "claimID",
                sClaimId
            );

            oAction.execute()

                .then(function () {

                    var oResult =
                        oAction
                            .getBoundContext()
                            .getObject();

                    console.log(
                        "AI Analysis Result:",
                        oResult
                    );

                    var sAnalysis =
                        oResult.value ||
                        oResult.analysis ||
                        oResult;

                    var sAnalysisText =
                        typeof sAnalysis === "string"
                            ? sAnalysis
                            : JSON.stringify(
                                sAnalysis,
                                null,
                                2
                            );

                    /* Remove unnecessary AI introduction */

                    sAnalysisText =
                        sAnalysisText.replace(
                            /^(of course[,:\-]?\s*here(?:\s+is)?\s+(?:the\s+)?analysis\s+(?:of|for)\s+.*?\.\s*)/i,
                            ""
                        );

                    oAIModel.setProperty(
                        "/analysisHtml",
                        this._markdownToHtml(
                            sAnalysisText
                        )
                    );

                    return fetch(
                        "/odata/v4/investigation/FraudRiskScores" +
                        "?$filter=claim_ID%20eq%20" +
                        sClaimId +
                        "&$select=riskScore,riskLevel",
                        {
                            method: "GET",
                            headers: {
                                "Accept": "application/json"
                            },
                            credentials: "include"
                        }
                    );

                }.bind(this))

                .then(function (oResponse) {

                    if (!oResponse) {
                        return null;
                    }

                    if (!oResponse.ok) {
                        throw new Error(
                            "Unable to load fraud risk information. HTTP " +
                            oResponse.status
                        );
                    }

                    return oResponse.json();

                })

                .then(function (oFraudData) {

                    if (oFraudData) {

                        var aFraud =
                            oFraudData.value || [];

                        if (aFraud.length > 0) {

                            var oFraud =
                                aFraud[0];

                            var iFraudScore =
                                Number(
                                    oFraud.riskScore
                                );

                            var sRiskLevel =
                                oFraud.riskLevel || "";

                            oAIModel.setProperty(
                                "/fraudScore",
                                iFraudScore
                            );

                            oAIModel.setProperty(
                                "/fraudState",
                                this._getFraudState(
                                    iFraudScore
                                )
                            );

                            oAIModel.setProperty(
                                "/riskLevel",
                                sRiskLevel
                            );

                            oAIModel.setProperty(
                                "/riskState",
                                this._getRiskState(
                                    sRiskLevel
                                )
                            );

                        } else {

                            oAIModel.setProperty(
                                "/fraudScore",
                                "N/A"
                            );

                            oAIModel.setProperty(
                                "/fraudState",
                                "None"
                            );

                            oAIModel.setProperty(
                                "/riskLevel",
                                "N/A"
                            );

                            oAIModel.setProperty(
                                "/riskState",
                                "None"
                            );
                        }
                    }

                    this._oAIAnalysisDialog.setBusy(false);

                }.bind(this))

                .catch(function (oError) {

                    console.error(
                        "AI analysis error:",
                        oError
                    );

                    this._oAIAnalysisDialog.setBusy(false);

                    MessageBox.error(
                        oError.message ||
                        "Failed to analyze the claim."
                    );

                }.bind(this));
        },

        _getStatusState: function (sStatus) {

            switch (sStatus) {

                case "Approved":
                case "Paid":
                    return "Success";

                case "Rejected":
                    return "Error";

                case "UnderReview":
                case "InvestigationRequired":
                    return "Warning";

                case "PendingApproval":
                case "Submitted":
                    return "Information";

                case "Draft":
                    return "None";

                default:
                    return "None";
            }
        },
        _getRiskState: function (sRiskLevel) {

            switch (sRiskLevel) {

                case "Critical":
                    return "Error";

                case "High":
                    return "Warning";

                case "Medium":
                    return "Warning";

                case "Low":
                    return "Success";

                default:
                    return "None";
            }
        },
        _getFraudState: function (iScore) {

            iScore = Number(iScore);

            if (iScore > 75) {
                return "Error";
            }

            if (iScore > 50) {
                return "Warning";
            }

            if (iScore > 25) {
                return "Information";
            }

            return "Success";
        },

        _markdownToHtml: function (sText) {

            if (!sText) {
                return "<p>No AI analysis available.</p>";
            }

            var sHtml = String(sText);

            sHtml = sHtml
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // Existing Markdown formatting
            sHtml = sHtml.replace(
                /^### (.*)$/gm,
                "<h4>$1</h4>"
            );

            sHtml = sHtml.replace(
                /^## (.*)$/gm,
                "<h3>$1</h3>"
            );

            sHtml = sHtml.replace(
                /^# (.*)$/gm,
                "<h2>$1</h2>"
            );

            sHtml = sHtml.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );

            // Highlight Risk Levels
            sHtml = sHtml.replace(
                /\bCritical\b/gi,
                "<strong style='color:#bb0000;'>Critical</strong>"
            );

            sHtml = sHtml.replace(
                /\bHigh\b/gi,
                "<strong style='color:#e9730c;'>High</strong>"
            );

            sHtml = sHtml.replace(
                /\bMedium\b/gi,
                "<strong style='color:#b26a00;'>Medium</strong>"
            );

            sHtml = sHtml.replace(
                /\bLow\b/gi,
                "<strong style='color:#107e3e;'>Low</strong>"
            );

            // Highlight Fraud Score
            sHtml = sHtml.replace(
                /(Fraud Score[^0-9]*\d+(?:\s*\/\s*100)?)/gi,
                "<strong>$1</strong>"
            );

            // Highlight INR amount
            sHtml = sHtml.replace(
                /(₹[\d,]+(?:\.\d+)?(?:\s*INR)?)/gi,
                "<strong>$1</strong>"
            );

            // Highlight Claim Number
            sHtml = sHtml.replace(
                /\bCLM\d+\b/gi,
                "<strong>$&</strong>"
            );

            // Highlight Policy Number
            sHtml = sHtml.replace(
                /\bPolicy\s*\d+\b/gi,
                "<strong>$&</strong>"
            );

            // Highlight dates
            sHtml = sHtml.replace(
                /\b\d{4}-\d{2}-\d{2}\b/g,
                "<strong>$&</strong>"
            );

            // Keep bullet points
            sHtml = sHtml.replace(
                /^- (.*)$/gm,
                "<li>$1</li>"
            );

            sHtml = sHtml.replace(
                /((?:<li>.*?<\/li>\s*)+)/gs,
                "<ul>$1</ul>"
            );

            sHtml = sHtml.replace(
                /\n\n/g,
                "<br><br>"
            );

            sHtml = sHtml.replace(
                /\n/g,
                "<br>"
            );

            return sHtml;
        },

        onCloseAIAnalysis: function () {

            if (this._oAIAnalysisDialog) {

                this._oAIAnalysisDialog.close();
            }
        }

    });

});