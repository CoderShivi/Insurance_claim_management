sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/viz/ui5/controls/Popover",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/ui/core/Icon"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    VizPopover,
    List,
    StandardListItem,
    VBox,
    HBox,
    Text,
    Icon
) {
    "use strict";

    var STATUS_COLORS = {
        "Rejected": "#D85A30",
        "Approved": "#1D9E75",
        "Paid": "#2FA8A0",
        "Pending / review": "#EF9F27",
        "InvestigationRequired": "#7F77DD",
        "Submitted": "#3E7CB1",
        "Draft": "#3E7CB1"
    };

    var FALLBACK_PALETTE = [
        "#3E7CB1",
        "#1D9E75",
        "#EF9F27",
        "#7F77DD",
        "#D85A30",
        "#2FA8A0",
        "#C2571F",
        "#4C6EF5"
    ];

    var STATUS_PILL_COLORS = {
        "PendingApproval": {
            bg: "#E9F1FB",
            text: "#2563A6",
            label: "Pending Approval"
        },
        "UnderReview": {
            bg: "#FDF2E3",
            text: "#A66A0A",
            label: "Under Review"
        },
        "Rejected": {
            bg: "#FBEAE5",
            text: "#B33F1E",
            label: "Rejected"
        },
        "Submitted": {
            bg: "#E9F1FB",
            text: "#2563A6",
            label: "Submitted"
        },
        "Approved": {
            bg: "#E6F5EF",
            text: "#0F6E56",
            label: "Approved"
        },
        "Paid": {
            bg: "#E6F5EF",
            text: "#0F6E56",
            label: "Paid"
        },
        "Draft": {
            bg: "#F0F3F7",
            text: "#4A6175",
            label: "Draft"
        },
        "InvestigationRequired": {
            bg: "#F1EEFB",
            text: "#5B55A5",
            label: "Investigation Required"
        }
    };

    return Controller.extend(
        "claimsure.app.controller.Dashboard",
        {

            /* =========================================================
             * INIT
             * ========================================================= */

            onInit: function () {

                this.getView().setModel(
                    new JSONModel({
                        totalClaims: 0,
                        pendingApproval: 0,
                        rejectedClaims: 0,
                        submittedClaims: 0,
                        approvedClaims: 0,
                        totalPolicies: 0,
                        activePolicies: 0,
                        totalCustomers: 0,
                        newCustomersThisMonth: 0,
                        totalClaimTypes: 0
                    }),
                    "dash"
                );

                this.getView().setModel(
                    new JSONModel([]),
                    "recent"
                );

                this.getView().setModel(
                    new JSONModel({
                        items: []
                    }),
                    "statusChart"
                );

                this.getView().setModel(
                    new JSONModel({
                        items: []
                    }),
                    "policyTypeChart"
                );

                this._loadDashboardData();
            },


            /* =========================================================
             * AFTER RENDERING
             * ========================================================= */

            onAfterRendering: function () {

                var oView = this.getView();

                var mHandlers = {
                    "navCardClaims": this.onNavClaims,
                    "navCardPolicies": this.onNavPolicies,
                    "navCardCustomers": this.onNavCustomers,
                    "navCardClaimTypes": this.onNavClaimTypes,

                    "kpiPendingApproval":
                        this.onKpiPendingApproval,

                    "kpiRejected":
                        this.onKpiRejected,

                    "kpiSubmitted":
                        this.onKpiSubmitted,

                    "kpiApproved":
                        this.onKpiApproved,

                    "kpiActivePolicies":
                        this.onKpiActivePolicies
                };

                Object.keys(mHandlers).forEach(
                    function (sId) {

                        var oControl =
                            oView.byId(sId);

                        if (
                            oControl &&
                            oControl.getDomRef()
                        ) {

                            oControl.$()
                                .off("click.dashboardCard")
                                .on(
                                    "click.dashboardCard",
                                    mHandlers[sId].bind(this)
                                )

                                .off("keydown.dashboardCard")
                                .on(
                                    "keydown.dashboardCard",
                                    function (oEvent) {

                                        if (
                                            oEvent.key === "Enter" ||
                                            oEvent.key === " "
                                        ) {

                                            oEvent.preventDefault();

                                            mHandlers[sId].call(
                                                this
                                            );
                                        }

                                    }.bind(this)
                                );
                        }

                    }.bind(this)
                );

                this._attachVizPopover();
            },


            /* =========================================================
             * VIZ POPOVER
             * ========================================================= */

            _attachVizPopover: function () {

                var oStatusVizFrame =
                    this.getView().byId(
                        "statusVizFrame"
                    );

                if (
                    oStatusVizFrame &&
                    !this._oStatusVizPopover
                ) {

                    oStatusVizFrame.setVizProperties({

                        title: {
                            visible: false
                        },

                        legend: {
                            visible: true,
                            alignment: "center",
                            layout: {
                                position: "right"
                            }
                        },

                        plotArea: {

                            dataLabel: {
                                visible: true,
                                showTotal: false,
                                distance: 15
                            }
                        }
                    });

                    this._oStatusVizPopover =
                        new VizPopover();

                    this._oStatusVizPopover.connect(
                        oStatusVizFrame.getVizUid()
                    );
                }


                var oPolicyVizFrame =
                    this.getView().byId(
                        "policyTypeVizFrame"
                    );

                if (
                    oPolicyVizFrame &&
                    !this._oPolicyVizPopover
                ) {

                    oPolicyVizFrame.setVizProperties({

                        title: {
                            visible: false
                        },

                        legend: {
                            visible: false
                        },

                        plotArea: {

                            dataLabel: {
                                visible: true
                            },

                            colorPalette: [
                                "#3E7CB1",
                                "#1D9E75",
                                "#EF9F27",
                                "#7F77DD",
                                "#D85A30",
                                "#2FA8A0",
                                "#C2571F",
                                "#4C6EF5"
                            ]
                        }
                    });

                    this._oPolicyVizPopover =
                        new VizPopover();

                    this._oPolicyVizPopover.connect(
                        oPolicyVizFrame.getVizUid()
                    );
                }
            },


            /* =========================================================
             * DASHBOARD DATA
             * ========================================================= */

            _loadDashboardData: function () {

                var oModel =
                    this.getOwnerComponent().getModel();

                var oAdminModel =
                    this.getOwnerComponent()
                        .getModel("admin");

                if (!oModel) {

                    console.error(
                        "[Dashboard] Default insurance model is not available."
                    );

                    return;
                }


                Promise.all([

                    // Claim Types
                    this._loadLookupMap(
                        oAdminModel,
                        "/ClaimTypes",
                        "name"
                    ),

                    // Customers
                    this._loadLookupMap(
                        oAdminModel,
                        "/Customers",
                        null
                    ),

                    // Policies
                    this._loadPolicyLookupMap(
                        oModel
                    )

                ])
                .then(function (aMaps) {

                    return this._loadClaims(
                        oModel,
                        aMaps[0],
                        aMaps[1],
                        aMaps[2]
                    );

                }.bind(this))
                .catch(function (oErr) {

                    console.error(
                        "[Dashboard] Failed to load claims",
                        oErr
                    );
                });


                this._loadPolicyCounts(oModel);

                this._loadPolicyTypeChart(
                    oModel,
                    oAdminModel
                );

                this._loadCustomerCount(
                    oAdminModel
                );

                this._loadClaimTypeCount(
                    oAdminModel
                );
            },


            /* =========================================================
             * GENERIC LOOKUP
             *
             * ClaimTypes:
             *   ID -> name
             *
             * Customers:
             *   ID -> firstName + lastName
             * ========================================================= */

            _loadLookupMap: function (
                oModel,
                sPath,
                sNameField
            ) {

                return new Promise(
                    function (resolve) {

                        if (!oModel) {
                            resolve({});
                            return;
                        }

                        var oBinding =
                            oModel.bindList(
                                sPath,
                                undefined,
                                undefined,
                                undefined,
                                {
                                    $select:
                                        sNameField
                                            ? "ID," +
                                              sNameField
                                            : "ID,firstName,lastName"
                                }
                            );

                        oBinding
                            .requestContexts(
                                0,
                                1000
                            )
                            .then(
                                function (aContexts) {

                                    var mMap = {};

                                    aContexts.forEach(
                                        function (oCtx) {

                                            var oData =
                                                oCtx.getObject();

                                            if (sNameField) {

                                                mMap[oData.ID] =
                                                    oData[
                                                        sNameField
                                                    ];

                                            } else {

                                                mMap[oData.ID] =
                                                    [
                                                        oData.firstName,
                                                        oData.lastName
                                                    ]
                                                    .filter(Boolean)
                                                    .join(" ");
                                            }
                                        }
                                    );

                                    resolve(mMap);
                                }
                            )
                            .catch(
                                function (oErr) {

                                    console.warn(
                                        "[Dashboard] Lookup failed for " +
                                        sPath,
                                        oErr
                                    );

                                    resolve({});
                                }
                            );
                    }
                );
            },


            /* =========================================================
             * POLICY LOOKUP
             *
             * Policy ID ->
             * {
             *     policyNumber,
             *     claimType_ID
             * }
             * ========================================================= */

            _loadPolicyLookupMap: function (
                oModel
            ) {

                return new Promise(
                    function (resolve) {

                        if (!oModel) {
                            resolve({});
                            return;
                        }

                        var oBinding =
                            oModel.bindList(
                                "/Policies",
                                undefined,
                                undefined,
                                undefined,
                                {
                                    $select:
                                        "ID,policyNumber,claimType_ID"
                                }
                            );

                        oBinding
                            .requestContexts(
                                0,
                                1000
                            )
                            .then(
                                function (aContexts) {

                                    var mMap = {};

                                    aContexts.forEach(
                                        function (oCtx) {

                                            var oData =
                                                oCtx.getObject();

                                            mMap[oData.ID] = {

                                                policyNumber:
                                                    oData.policyNumber,

                                                claimType_ID:
                                                    oData.claimType_ID
                                            };
                                        }
                                    );

                                    resolve(mMap);
                                }
                            )
                            .catch(
                                function (oErr) {

                                    console.warn(
                                        "[Dashboard] Policy lookup failed",
                                        oErr
                                    );

                                    resolve({});
                                }
                            );
                    }
                );
            },


            /* =========================================================
             * CLAIMS
             * ========================================================= */

            _loadClaims: function (
                oModel,
                mClaimTypes,
                mCustomers,
                mPolicies
            ) {

                var oClaimsBinding =
                    oModel.bindList(
                        "/Claims",
                        undefined,
                        undefined,
                        undefined,
                        {
                            $select:
                                "ID,claimNumber,claimedAmount,status,customer_ID,claimType_ID,policy_ID",

                            $orderby:
                                "claimNumber desc"
                        }
                    );


                return oClaimsBinding
                    .requestContexts(
                        0,
                        200
                    )
                    .then(
                        function (aContexts) {

                            var aClaims =
                                aContexts.map(
                                    function (oCtx) {

                                        var oData =
                                            oCtx.getObject();

                                        var oPolicy =
                                            mPolicies[
                                                oData.policy_ID
                                            ];


                                        return Object.assign(
                                            {},
                                            oData,
                                            {

                                                customerName:
                                                    mCustomers[
                                                        oData.customer_ID
                                                    ] || "",


                                                claimTypeName:
                                                    mClaimTypes[
                                                        oData.claimType_ID
                                                    ] || "",


                                                policyNumber:
                                                    oPolicy &&
                                                    oPolicy.policyNumber
                                                        ? oPolicy.policyNumber
                                                        : "",


                                                /*
                                                 * Policies entity does not
                                                 * contain a name field.
                                                 *
                                                 * Therefore we display the
                                                 * Claim Type name associated
                                                 * with the Policy.
                                                 */

                                                policyName:
                                                    oPolicy &&
                                                    oPolicy.claimType_ID
                                                        ? (
                                                            mClaimTypes[
                                                                oPolicy.claimType_ID
                                                            ] || ""
                                                        )
                                                        : ""
                                            }
                                        );
                                    }
                                );


                            var oDash =
                                this.getView()
                                    .getModel("dash");


                            /* Total Claims */

                            oDash.setProperty(
                                "/totalClaims",
                                aClaims.length
                            );


                            /* Pending Approval */

                            oDash.setProperty(
                                "/pendingApproval",

                                aClaims.filter(
                                    function (c) {

                                        return (
                                            c.status ===
                                                "PendingApproval" ||

                                            c.status ===
                                                "UnderReview"
                                        );
                                    }
                                ).length
                            );


                            /* Rejected */

                            oDash.setProperty(
                                "/rejectedClaims",

                                aClaims.filter(
                                    function (c) {

                                        return c.status ===
                                            "Rejected";
                                    }
                                ).length
                            );


                            /* Submitted */

                            oDash.setProperty(
                                "/submittedClaims",

                                aClaims.filter(
                                    function (c) {

                                        return c.status ===
                                            "Submitted";
                                    }
                                ).length
                            );


                            /* Approved */

                            oDash.setProperty(
                                "/approvedClaims",

                                aClaims.filter(
                                    function (c) {

                                        return c.status ===
                                            "Approved";
                                    }
                                ).length
                            );


                            this._buildStatusChart(
                                aClaims
                            );


                            this.getView()
                                .getModel("recent")
                                .setData(
                                    aClaims.slice(0, 5)
                                );

                        }.bind(this)
                    );
            },


            /* =========================================================
             * STATUS CHART
             * ========================================================= */

            _buildStatusChart: function (
                aClaims
            ) {

                var mStatusCounts = {};

                aClaims.forEach(
                    function (oClaim) {

                        var sKey =
                            oClaim.status ===
                                "PendingApproval" ||

                            oClaim.status ===
                                "UnderReview"

                                ? "Pending / review"

                                : (
                                    oClaim.status ||
                                    "Unknown"
                                );


                        mStatusCounts[sKey] =
                            (
                                mStatusCounts[sKey] ||
                                0
                            ) + 1;
                    }
                );


                var iTotal =
                    aClaims.length || 1;


                var aItems =
                    Object.keys(
                        mStatusCounts
                    )
                    .map(
                        function (
                            sStatus,
                            iIndex
                        ) {

                            var iCount =
                                mStatusCounts[
                                    sStatus
                                ];

                            var fShare =
                                (
                                    iCount /
                                    iTotal
                                ) * 100;


                            var sColor =
                                STATUS_COLORS[
                                    sStatus
                                ] ||

                                FALLBACK_PALETTE[
                                    iIndex %
                                    FALLBACK_PALETTE.length
                                ];


                            return {

                                status:
                                    sStatus,

                                count:
                                    iCount,

                                percentOfTotal:
                                    Math.round(
                                        fShare
                                    ),

                                color:
                                    sColor
                            };
                        }
                    );


                this.getView()
                    .getModel("statusChart")
                    .setData({
                        items: aItems
                    });
            },


            /* =========================================================
             * STATUS PILL
             * ========================================================= */

            formatStatusPillHtml: function (
                sStatus
            ) {

                var oColors =
                    STATUS_PILL_COLORS[
                        sStatus
                    ] ||

                    {
                        bg: "#F0F0EC",
                        text: "#6E6E6E",
                        label:
                            sStatus ||
                            "Unknown"
                    };


                return (
                    "<span class='statusPill' style='background:" +
                    oColors.bg +
                    ";color:" +
                    oColors.text +
                    ";'>" +

                    this._escapeHtml(
                        oColors.label
                    ) +

                    "</span>"
                );
            },


            /* =========================================================
             * CURRENCY
             * ========================================================= */

            formatCurrency: function (
                vAmount
            ) {

                if (
                    vAmount === null ||
                    vAmount === undefined ||
                    vAmount === ""
                ) {

                    return "—";
                }


                var fAmount =
                    Number(vAmount);


                if (isNaN(fAmount)) {
                    return String(vAmount);
                }


                return (
                    "₹ " +
                    fAmount.toLocaleString(
                        "en-IN",
                        {
                            maximumFractionDigits: 2
                        }
                    )
                );
            },


            /* =========================================================
             * POLICY SVG
             * ========================================================= */

            formatPolicyTypeChartSvg: function (
                aItems
            ) {

                if (
                    !aItems ||
                    !aItems.length
                ) {

                    return (
                        "<div class='legendEmpty'>" +
                        "No policy data" +
                        "</div>"
                    );
                }


                var iBarWidth = 30;
                var iGap = 22;
                var iChartHeight = 140;
                var iTopPad = 28;
                var iLabelHeight = 60;
                var iSidePad = 40;


                var iChartWidth =
                    aItems.length *
                    (
                        iBarWidth +
                        iGap
                    ) +
                    iGap;


                var iWidth =
                    iChartWidth +
                    iSidePad;


                var iHeight =
                    iTopPad +
                    iChartHeight +
                    iLabelHeight;


                var iMaxCount =
                    Math.max.apply(
                        null,
                        aItems.map(
                            function (oItem) {
                                return oItem.count;
                            }
                        )
                    ) || 1;


                var iTickCount =
                    Math.min(
                        iMaxCount,
                        4
                    );


                var sGrid = "";


                for (
                    var t = 0;
                    t <= iTickCount;
                    t++
                ) {

                    var fRatio =
                        t /
                        iTickCount;


                    var iY =
                        iTopPad +
                        iChartHeight -
                        Math.round(
                            fRatio *
                            iChartHeight
                        );


                    var iTickValue =
                        Math.round(
                            fRatio *
                            iMaxCount
                        );


                    sGrid +=

                        "<line x1='0' y1='" +
                        iY +
                        "' x2='" +
                        iWidth +
                        "' y2='" +
                        iY +
                        "' class='chartGridLine'></line>" +

                        "<text x='2' y='" +
                        (iY - 3) +
                        "' class='chartGridLabel'>" +

                        iTickValue +

                        "</text>";
                }


                var sBars =
                    aItems.map(
                        function (
                            oItem,
                            i
                        ) {

                            var iBarHeight =
                                Math.max(
                                    8,
                                    Math.round(
                                        (
                                            oItem.count /
                                            iMaxCount
                                        ) *
                                        iChartHeight
                                    )
                                );


                            var iX =
                                iSidePad / 2 +
                                iGap +
                                i *
                                (
                                    iBarWidth +
                                    iGap
                                );


                            var iY =
                                iTopPad +
                                iChartHeight -
                                iBarHeight;


                            var iLabelY =
                                iTopPad +
                                iChartHeight +
                                18;


                            var iCenterX =
                                iX +
                                iBarWidth / 2;


                            var sLabel =
                                oItem.type;


                            return (

                                "<rect x='" +
                                iX +
                                "' y='" +
                                iY +
                                "' width='" +
                                iBarWidth +
                                "' height='" +
                                iBarHeight +
                                "' fill='" +
                                oItem.color +
                                "' rx='5'>" +

                                "<title>" +

                                this._escapeHtml(
                                    oItem.type
                                ) +

                                " — " +

                                oItem.count +

                                "</title></rect>" +


                                "<text x='" +
                                iCenterX +
                                "' y='" +
                                (iY - 9) +
                                "' text-anchor='middle' class='chartBarValue'>" +

                                oItem.count +

                                "</text>" +


                                "<text x='" +
                                iCenterX +
                                "' y='" +
                                iLabelY +
                                "' text-anchor='end' class='chartBarLabel' " +

                                "transform='rotate(-40 " +
                                iCenterX +
                                " " +
                                iLabelY +
                                ")'>" +

                                this._escapeHtml(
                                    sLabel
                                ) +

                                "</text>"
                            );

                        }.bind(this)
                    )
                    .join("");


                return (
                    "<svg viewBox='0 0 " +
                    iWidth +
                    " " +
                    iHeight +
                    "' class='policyChartSvg' preserveAspectRatio='none'>" +

                    sGrid +
                    sBars +

                    "</svg>"
                );
            },


            /* =========================================================
             * POLICY COUNTS
             * ========================================================= */

            _loadPolicyCounts: function (
                oModel
            ) {

                if (!oModel) {
                    return;
                }


                var oAllBinding =
                    oModel.bindList(
                        "/Policies",
                        undefined,
                        undefined,
                        undefined,
                        {
                            $select: "ID"
                        }
                    );


                oAllBinding
                    .requestContexts(
                        0,
                        1000
                    )
                    .then(
                        function (aCtx) {

                            this.getView()
                                .getModel("dash")
                                .setProperty(
                                    "/totalPolicies",
                                    aCtx.length
                                );

                        }.bind(this)
                    )
                    .catch(
                        function (oErr) {

                            console.warn(
                                "[Dashboard] Total policies failed",
                                oErr
                            );
                        }
                    );


                var oActiveBinding =
                    oModel.bindList(
                        "/Policies",
                        undefined,
                        undefined,
                        new Filter(
                            "status",
                            FilterOperator.EQ,
                            "Active"
                        ),
                        {
                            $select: "ID",
                            $$operationMode:
                                "Server"
                        }
                    );


                oActiveBinding
                    .requestContexts(
                        0,
                        1000
                    )
                    .then(
                        function (aCtx) {

                            this.getView()
                                .getModel("dash")
                                .setProperty(
                                    "/activePolicies",
                                    aCtx.length
                                );

                        }.bind(this)
                    )
                    .catch(
                        function (oErr) {

                            console.warn(
                                "[Dashboard] Active policies failed",
                                oErr
                            );
                        }
                    );
            },


            /* =========================================================
             * CUSTOMER COUNT
             * ========================================================= */

            _loadCustomerCount: function (
                oAdminModel
            ) {

                if (!oAdminModel) {
                    return;
                }


                var oBinding =
                    oAdminModel.bindList(
                        "/Customers",
                        undefined,
                        undefined,
                        undefined,
                        {
                            $select: "ID"
                        }
                    );


                oBinding
                    .requestContexts(
                        0,
                        1000
                    )
                    .then(
                        function (aCtx) {

                            this.getView()
                                .getModel("dash")
                                .setProperty(
                                    "/totalCustomers",
                                    aCtx.length
                                );

                        }.bind(this)
                    )
                    .catch(
                        function (oErr) {

                            console.warn(
                                "[Dashboard] Customers count failed",
                                oErr
                            );
                        }
                    );
            },


            /* =========================================================
             * CLAIM TYPE COUNT
             * ========================================================= */

            _loadClaimTypeCount: function (
                oAdminModel
            ) {

                if (!oAdminModel) {
                    return;
                }


                var oBinding =
                    oAdminModel.bindList(
                        "/ClaimTypes",
                        undefined,
                        undefined,
                        undefined,
                        {
                            $select: "ID"
                        }
                    );


                oBinding
                    .requestContexts(
                        0,
                        1000
                    )
                    .then(
                        function (aCtx) {

                            this.getView()
                                .getModel("dash")
                                .setProperty(
                                    "/totalClaimTypes",
                                    aCtx.length
                                );

                        }.bind(this)
                    )
                    .catch(
                        function (oErr) {

                            console.warn(
                                "[Dashboard] ClaimTypes count failed",
                                oErr
                            );
                        }
                    );
            },


            /* =========================================================
             * POLICY TYPE CHART
             * ========================================================= */

            _loadPolicyTypeChart: function (
                oModel,
                oAdminModel
            ) {

                if (!oModel) {
                    return;
                }


                this._loadLookupMap(
                    oAdminModel,
                    "/ClaimTypes",
                    "name"
                )
                .then(
                    function (mClaimTypes) {

                        var oBinding =
                            oModel.bindList(
                                "/Policies",
                                undefined,
                                undefined,
                                undefined,
                                {
                                    $select:
                                        "ID,claimType_ID"
                                }
                            );


                        return oBinding
                            .requestContexts(
                                0,
                                500
                            )
                            .then(
                                function (aContexts) {

                                    var aPolicies =
                                        aContexts.map(
                                            function (oCtx) {

                                                var oData =
                                                    oCtx.getObject();

                                                return {

                                                    type:
                                                        mClaimTypes[
                                                            oData.claimType_ID
                                                        ] ||

                                                        oData.claimType_ID ||

                                                        "Unknown"
                                                };
                                            }
                                        );


                                    this._buildPolicyTypeChart(
                                        aPolicies
                                    );

                                }.bind(this)
                            );
                    }.bind(this)
                )
                .catch(
                    function (oErr) {

                        console.error(
                            "[Dashboard] Policy type chart failed",
                            oErr
                        );
                    }
                );
            },


            /* =========================================================
             * BUILD POLICY TYPE CHART
             * ========================================================= */

            _buildPolicyTypeChart: function (
                aPolicies
            ) {

                var mCounts = {};


                aPolicies.forEach(
                    function (oPolicy) {

                        var sKey =
                            oPolicy.type ||
                            "Unknown";


                        mCounts[sKey] =
                            (
                                mCounts[sKey] ||
                                0
                            ) + 1;
                    }
                );


                var aItems =
                    Object.keys(
                        mCounts
                    )
                    .map(
                        function (
                            sType,
                            iIndex
                        ) {

                            return {

                                type:
                                    sType,

                                count:
                                    mCounts[sType],

                                color:
                                    FALLBACK_PALETTE[
                                        iIndex %
                                        FALLBACK_PALETTE.length
                                    ]
                            };
                        }
                    )
                    .sort(
                        function (a, b) {

                            return (
                                b.count -
                                a.count
                            );
                        }
                    );


                this.getView()
                    .getModel(
                        "policyTypeChart"
                    )
                    .setData({
                        items: aItems
                    });
            },


            /* =========================================================
             * CLAIM PRESS
             * ========================================================= */

            onClaimPress: function (
                oEvent
            ) {

                var oCtx =
                    oEvent
                        .getSource()
                        .getBindingContext(
                            "recent"
                        );


                if (!oCtx) {
                    return;
                }


                var sClaimId =
                    oCtx.getProperty(
                        "ID"
                    );


                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "claimDetail",
                        {
                            claimId:
                                sClaimId
                        }
                    );
            },


            /* =========================================================
             * NAVIGATION
             * ========================================================= */

            onViewAllClaims: function () {
                this.onNavClaims();
            },


            onNavClaims: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo("claims");
            },


            onNavPolicies: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo("policies");
            },


            onNavCustomers: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "admin",
                        {
                            "?query": {
                                tab: "customers"
                            }
                        }
                    );
            },


            onNavClaimTypes: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "admin",
                        {
                            "?query": {
                                tab: "claimTypes"
                            }
                        }
                    );
            },


            /* =========================================================
             * KPI NAVIGATION
             * ========================================================= */

            onKpiPendingApproval: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "claims",
                        {
                            "?query": {
                                status: "Pending"
                            }
                        }
                    );
            },


            onKpiRejected: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "claims",
                        {
                            "?query": {
                                status: "Rejected"
                            }
                        }
                    );
            },


            onKpiSubmitted: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "claims",
                        {
                            "?query": {
                                status: "Submitted"
                            }
                        }
                    );
            },


            onKpiApproved: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "claims",
                        {
                            "?query": {
                                status: "Approved"
                            }
                        }
                    );
            },


            onKpiActivePolicies: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "policies",
                        {
                            "?query": {
                                status: "Active"
                            }
                        }
                    );
            },


            /* =========================================================
             * HTML ESCAPE
             * ========================================================= */

            _escapeHtml: function (
                sValue
            ) {

                return String(
                    sValue === null ||
                    sValue === undefined
                        ? ""
                        : sValue
                )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );
            }

        }
    );
});