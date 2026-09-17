sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "claimsure/app/model/formatter"
], function (
    Controller,
    JSONModel,
    ODataModel,
    Filter,
    FilterOperator,
    MessageBox,
    formatter
) {
    "use strict";

    return Controller.extend("claimsure.app.controller.ClaimDetail", {

        formatter: formatter,

        onInit: function () {

            this._sClaimId = null;

            var oDetailModel = new JSONModel({
                busy: false,

                ID: "",
                claimNumber: "",
                customer_ID: "",
                claimType_ID: "",
                policy_ID: "",
                incidentDate: "",
                description: "",
                claimedAmount: "",
                status: "",

                assignedAgent_ID: "",
                assignedAgentDisplay: "Not Assigned",

                employeeNumber: "",
                department: "",
                role: "",
                email: "",

                policy: null,
                documents: [],
                fraudRiskScores: []
            });

            this.getView().setModel(
                oDetailModel,
                "claimDetail"
            );

            /*
             * MainService
             * Used to read Employees.
             */
            this._oMainModel = new ODataModel({
                serviceUrl: "/odata/v4/main/",
                synchronizationMode: "None",
                autoExpandSelect: true
            });

            this.getOwnerComponent()
                .getRouter()
                .getRoute("claimDetail")
                .attachPatternMatched(
                    this._onRouteMatched,
                    this
                );
        },

        _onRouteMatched: function (oEvent) {

            var oArguments = oEvent.getParameter("arguments");

            this._sClaimId = oArguments.claimId;

            console.log(
                "[ClaimDetail] Claim ID:",
                this._sClaimId
            );

            if (!this._sClaimId) {
                MessageBox.error(
                    "Claim ID is missing from the route."
                );
                return;
            }

            this._loadClaim(this._sClaimId);
        },

        _loadClaim: async function (sClaimId) {

            var oInsuranceModel = this.getView().getModel();
            var oDetailModel = this.getView().getModel("claimDetail");

            if (!oInsuranceModel) {
                MessageBox.error(
                    "InsuranceService OData model is not available."
                );
                return;
            }

            oDetailModel.setProperty("/busy", true);

            try {

                /*
                 * Load Claim.
                 *
                 * assignedAgent is NOT expanded because
                 * Employees belongs to MainService.
                 */
                var oClaimBinding = oInsuranceModel.bindContext(
                    "/Claims(" + sClaimId + ")",
                    undefined,
                    {
                        $expand: "policy,documents"
                    }
                );

                var oClaim =
                    await oClaimBinding.requestObject();

                if (!oClaim) {
                    MessageBox.error("Claim not found.");
                    return;
                }

                console.log(
                    "[ClaimDetail] Claim:",
                    oClaim
                );

                console.log(
                    "[ClaimDetail] assignedAgent_ID:",
                    oClaim.assignedAgent_ID
                );

                /*
                 * Store claim data.
                 */
                oDetailModel.setData({
                    busy: false,

                    ID: oClaim.ID || "",

                    claimNumber:
                        oClaim.claimNumber || "",

                    customer_ID:
                        oClaim.customer_ID || "",

                    claimType_ID:
                        oClaim.claimType_ID || "",

                    policy_ID:
                        oClaim.policy_ID || "",

                    incidentDate:
                        oClaim.incidentDate || "",

                    description:
                        oClaim.description || "",

                    claimedAmount:
                        oClaim.claimedAmount || "",

                    status:
                        oClaim.status || "",

                    assignedAgent_ID:
                        oClaim.assignedAgent_ID || "",

                    assignedAgentDisplay:
                        "Not Assigned",

                    employeeNumber: "",
                    department: "",
                    role: "",
                    email: "",

                    policy:
                        oClaim.policy || null,

                    documents:
                        oClaim.documents || [],

                    fraudRiskScores: []
                });

                /*
                 * Load assigned employee.
                 */
                if (oClaim.assignedAgent_ID) {

                    await this._loadAssignedAgent(
                        oClaim.assignedAgent_ID
                    );

                } else {

                    console.warn(
                        "[ClaimDetail] No assigned agent ID."
                    );

                    oDetailModel.setProperty(
                        "/assignedAgentDisplay",
                        "Not Assigned"
                    );
                }

                /*
                 * Load fraud risk scores.
                 */
                await this._loadFraudRiskScores(
                    sClaimId
                );

            } catch (oError) {

                console.error(
                    "[ClaimDetail] Error loading claim:",
                    oError
                );

                MessageBox.error(
                    "Could not load claim details.\n\n" +
                    (
                        oError && oError.message
                            ? oError.message
                            : "Unknown error"
                    )
                );

            } finally {

                oDetailModel.setProperty(
                    "/busy",
                    false
                );
            }
        },

        /*
         * ============================================================
         * LOAD ASSIGNED EMPLOYEE
         * ============================================================
         */
        _loadAssignedAgent: async function (sEmployeeId) {

            var oDetailModel =
                this.getView().getModel("claimDetail");

            if (!sEmployeeId) {

                oDetailModel.setProperty(
                    "/assignedAgentDisplay",
                    "Not Assigned"
                );

                return;
            }

            console.log(
                "[ClaimDetail] Fetching employee:",
                sEmployeeId
            );

            try {

                /*
                 * MainService:
                 *
                 * /odata/v4/main/Employees(<UUID>)
                 */
                var oEmployeeBinding =
                    this._oMainModel.bindContext(
                        "/Employees(" + sEmployeeId + ")",
                        undefined,
                        {
                            $select:
                                "ID,employeeNumber,firstName,lastName,department,role,email,active"
                        }
                    );

                var oEmployee =
                    await oEmployeeBinding.requestObject();

                console.log(
                    "[ClaimDetail] Employee response:",
                    oEmployee
                );

                if (!oEmployee) {

                    console.warn(
                        "[ClaimDetail] Employee not found."
                    );

                    oDetailModel.setProperty(
                        "/assignedAgentDisplay",
                        "Not Assigned"
                    );

                    return;
                }

                /*
                 * Create employee full name.
                 */
                var sFullName = [
                    oEmployee.firstName,
                    oEmployee.lastName
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                if (!sFullName) {
                    sFullName = "Not Assigned";
                }

                /*
                 * Display employee NAME instead of ID.
                 */
                oDetailModel.setProperty(
                    "/assignedAgentDisplay",
                    sFullName
                );

                /*
                 * Store employee details.
                 */
                oDetailModel.setProperty(
                    "/employeeNumber",
                    oEmployee.employeeNumber || ""
                );

                oDetailModel.setProperty(
                    "/department",
                    oEmployee.department || ""
                );

                oDetailModel.setProperty(
                    "/role",
                    oEmployee.role || ""
                );

                oDetailModel.setProperty(
                    "/email",
                    oEmployee.email || ""
                );

                console.log(
                    "[ClaimDetail] Assigned Agent Name:",
                    sFullName
                );

            } catch (oError) {

                console.error(
                    "[ClaimDetail] Employee loading failed:",
                    oError
                );

                oDetailModel.setProperty(
                    "/assignedAgentDisplay",
                    "Not Assigned"
                );
            }
        },

        /*
         * ============================================================
         * LOAD FRAUD RISK SCORES
         * ============================================================
         */
        _loadFraudRiskScores: async function (sClaimId) {

            var oModel =
                this.getView().getModel("investigation");

            if (!oModel) {

                console.warn(
                    "[ClaimDetail] Investigation model not available."
                );

                return;
            }

            try {

                var oBinding =
                    oModel.bindList(
                        "/FraudRiskScores",
                        undefined,
                        undefined,
                        [
                            new Filter(
                                "claim_ID",
                                FilterOperator.EQ,
                                sClaimId
                            )
                        ],
                        {
                            $select:
                                "ID,claim_ID,riskScore,riskLevel"
                        }
                    );

                var aContexts =
                    await oBinding.requestContexts(
                        0,
                        100
                    );

                var aScores =
                    aContexts.map(
                        function (oContext) {
                            return oContext.getObject();
                        }
                    );

                console.log(
                    "[ClaimDetail] Fraud scores:",
                    aScores
                );

                this.getView()
                    .getModel("claimDetail")
                    .setProperty(
                        "/fraudRiskScores",
                        aScores
                    );

            } catch (oError) {

                console.error(
                    "[ClaimDetail] Fraud score error:",
                    oError
                );
            }
        },

        onNavBack: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("claims");
        },
         

          onDocumentPress: function (oEvent) {

            var oDocument = oEvent.getSource()
                .getBindingContext("claimDetail")
                .getObject();

            if (!oDocument || !oDocument.ID) {
                MessageBox.error("Unable to open document.");
                return;
            }

            var oInsuranceModel = this.getView().getModel();

            if (!oInsuranceModel) {
                MessageBox.error("OData model is not available.");
                return;
            }

            var sBaseUrl = oInsuranceModel.getServiceUrl().replace(/\/$/, "");

            var sUrl = sBaseUrl +
                "/Claims(" + this._sClaimId + ")/documents(" + oDocument.ID + ")/content";

            window.open(sUrl, "_blank");
        }

    });
});