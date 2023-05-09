// the page will define a job_type variable set to either "timeseries" or "regrid"

// jquery-like shorthand for quick lookup of an element by id
$ = (id) => { return document.getElementById(id); }

// remove a value from an array
function removeValue(arr,v) {
    for(var i = arr.length - 1; i >= 0; i--) {
        if(arr[i] === v) {
            arr.splice(i, 1);
        }
    }
}

// define a Form object which binds to the form controls in the regrid job page
// and performs the following:
//
// (1) bind the form controls to javascript variables
// (2) react to control changes to show/hide or reconfigure other form controls
// (3) check the form is valid if the user wants to submit it, and report any problems
// (4) manage the submission of requests to the service:
//     * submit form
//     * resend e-mail for completed job
//     * retrieve list of jobs for a user

class Form {
    constructor(job_type) {

        this.job_type=job_type; // regrid, timeseries or region
        this.job_label = "";
        if (this.job_type == "timeseries") {
            this.bb_max_size = 5;
            this.job_label = "time series";
        } else if (this.job_type == "region") {
            this.bb_max_size = 20;
            this.job_label = "region";
        } else {
            this.bb_max_size = 0;
            this.job_label = "regrid";
        }

        // first bind elements in the page to member variables

        this.form = $("form");
        var that = this;
        this.email_address = $("email_address");
        this.time_step = $("time_step");
        this.daily_time_step = $("n_daily_step");
        this.n_daily_step_group = $("n_daily_step_group");

        this.dialog = $("dialog");
        this.dialog_content = $("dialog_content");
        this.dialog_content_close = $("dialog_content_close");

        var dialog_closefn = function() {
            that.dialog.setAttribute("style","display:none;");
            that.dialog_content_close.blur();
        }

        this.dialog_content_close.onkeydown = function(evt) {
            if (evt.keyCode == 13) {
                dialog_closefn();
            }
        }

        this.dialog_content_close.onclick = dialog_closefn;

        // specific to regrid
        this.longitude_step_group = $("longitude_step_group");
        this.latitude_step_group = $("latitude_step_group");
        this.longitude_step = $("longitude_step");
        this.latitude_step = $("latitude_step");

        // specific to time series or region
        this.bounding_box_longitude_group_row1 = $("bounding_box_longitude_group_row1");
        this.bounding_box_longitude_group_row2 = $("bounding_box_longitude_group_row2");
        this.bounding_box_latitude_group_row1 = $("bounding_box_latitude_group_row1");
        this.bounding_box_latitude_group_row2 = $("bounding_box_latitude_group_row2");
        this.bounding_box_longitude_centre = $("bounding_box_longitude_centre");
        this.bounding_box_longitude_width = $("bounding_box_longitude_width");
        this.bounding_box_latitude_centre = $("bounding_box_latitude_centre");
        this.bounding_box_latitude_height = $("bounding_box_latitude_height");
        this.timeseries_output_format = $("timeseries_output_format");
        this.timeseries_output_format_group = $("timeseries_output_format_group");
        this.bounding_box_map = $("bounding_box_map");
        this.bounding_box_map_group = $("bounding_box_map_group");
        this.requested_lat = 0.0;
        this.requested_lon = 0.0;

        // define the year range over which valid input data is available.
        // first year may not have data available from the first month.
        // start_year, start_month and end_year are globals that are set up from template parameters in app.html
        this.first_year = start_year;
        this.first_month = start_month;
        this.last_month = end_month;
        this.last_year = end_year;
        this.last_day = this.getDaysInMonth(""+end_year, ""+end_month);

        this.start_month_controls = $("start_month_controls");
        this.start_day_controls = $("start_day_controls");
        this.start_date_year = $("start_date_year");
        this.start_date_month = $("start_date_month");
        this.start_date_day = $("start_date_day");

        this.end_month_controls = $("end_month_controls");
        this.end_day_controls = $("end_day_controls");
        this.end_date_year = $("end_date_year");
        this.end_date_month = $("end_date_month");
        this.end_date_day = $("end_date_day");

        this.exclude_sea_ice = $("exclude_sea_ice");
        this.sea_ice_threshold = $("sea_ice_threshold");
        this.sea_ice_threshold_group = $("sea_ice_threshold_group");
        this.generate_sea_ice_fraction = $("generate_sea_ice_fraction");
        this.include_bias_adjustments = $("include_bias_adjustments");
        this.anomaly_or_absolute = $("anomaly_or_absolute");
        this.spatial_lambda = $("spatial_lambda");
        this.spatial_lambda_group = $("spatial_lambda_group");
        this.tau = $("tau");

        this.consent_optin = $("consent_optin");
        this.citation_optin = $("citation_optin");
        this.citation1 = $("citation1");
        this.citation2 = $("citation2");
        this.subscription_optin = $("subscription_optin");
        this.submit_btn = $("submit_btn");

        // job view controls
        this.job_view_open = false;     // whether the job view is toggled on or off
        this.job_parameters_open = {};  // whether the parameter view for a job is open or closed: job_id => Bool
        this.view_btn = $("view_btn");
        this.joblist = $("joblist");
        this.jobtable = $("jobtable");
        this.nojobs = $("nojobs");
        this.jobtablebody = $("jobtablebody");
        this.runningjobs = $("running_jobs");
        this.refresh_btn = $("refresh_btn");

        // keep a housekeeping list of all controls which have been reported as invalid
        this.alerted_controls = [];

        // configure help on each control - set the tooltip text
        this.addHelp("time_step_label","The target time resolution can be annual, monthly, dekadal (3 per month), or pentadal (6 per month). The final dekad or pentad per month then addresses a variable number of days. Alternatively, strict N-day averaging period can be requested, aligned with years, such that only the last period per year may address a number of days not equal to N.");
        this.addHelp("n_daily_step_label","When N-day averaging is requested, specify the number of days N.");
        this.addHelp("start_date_label","Set a start date for the regridded data set.");
        this.addHelp("end_date_label","Set an end date for the regridded data set.");
        this.addHelp("exclude_sea_ice_label","Ignore SST data from areas where the fraction of sea-ice present exceeds a threshold concentration? Sea-ice covered areas lack as many (or any) real SST observations, and accordingly the SST analysis is nudged towards a standard temperature for the freezing point of seawater where sea ice concentrations are high.");
        this.addHelp("sea_ice_threshold_label","The fraction of sea ice above which a cell is ignored in calculating the regridded SST. When calculating anomalies, the climatology is always calculated from all cells regardless of sea ice fraction.");
        this.addHelp("anomaly_or_absolute_label","Output SST anomaly values instead of absolute SSTs. The climatology is based on the analysis for the period 1982 to 2010 inclusive.");
        this.addHelp("generate_sea_ice_fraction_label","Output the sea ice fraction as a variable.");
        this.addHelp("include_bias_adjustments_label","The v2.1 record is known to have biases associated with desert dust aerosol and erratic calibration of early-record sensors [Merchant et al, 2019]. Adjustments to reduce these biases and include additional uncertainty in these effects have been developed, as described in [Merchant and Embury, 2020]. These adjustments operate on monthly and >5 degree time-space scales. Tick this box if you want these adjustments to be applied in your re-gridded dataset.");

        this.addHelp("tau_label","The time-scale in days over which errors in the SST analysis are assumed to be highly correlated. This is used as a parameter for the approximate propagation of uncertainty to the target space-time resolution.");
        this.addHelp("spatial_lambda_label","The length-scale in degrees of latitude and longitude over which errors in the SST analysis are assumed to be highly correlated. This is used as a parameter for the approximate propagation of uncertainty to the target space-time resolution.");
        this.addHelp("consent_optin_label","You must consent to your e-mail address being temporarily stored in order to use this service.");
        this.addHelp("citation_optin_label","You must consent to citing the paper(s) when using the data generated by this service.");
        this.addHelp("subscription_optin_label","By checking this box you consent to your email-address being stored and to receiving notifications when new data or features are added to the service.");

        // regrid specific
        this.addHelp("latitude_step_label","The target latitude resolution. This must be a multiple of 0.05 degrees and a factor of 180 degrees. It must also not be greater than 5 degrees.");
        this.addHelp("longitude_step_label","The target longitude resolution. This must be a multiple of 0.05 degrees and a factor of 360 degrees. It must also not be greater than 5 degrees.");

        // time series/region specific
        this.addHelp("bounding_box_longitude_centre_label","Set the degrees of longitude of the centre of the bounding box over which the "+this.job_label+" will be computed.  As the box width is adjusted this will be automatically slightly adjusted so that the bounding box is aligned to the 0.05 grid.");
        this.addHelp("bounding_box_longitude_width_label","Set the width in degrees of longitude of the bounding box over which the "+this.job_label+" will be computed.  Must be a multiple of 0.05 degrees and no more than "+this.bb_max_size+" degrees.");
        this.addHelp("bounding_box_latitude_centre_label","Set the degrees of latitude of the centre of the bounding box over which the "+this.job_label+" will be computed.  As the box height is adjusted this will be automatically slightly adjusted so that the bounding box is aligned to the 0.05 grid.");
        this.addHelp("bounding_box_latitude_height_label","Set the height in degrees of latitude of the bounding box over which the "+this.job_label+" will be computed.  Must be a multiple of 0.05 degrees and no more than "+this.bb_max_size+" degrees.");

        // time series specific
        this.addHelp("timeseries_output_format_label","Choose whether to generate the output time series as a netcdf4 or csv format file.");

        // set up event handlers on most of the controls
        // the handlers will typically enable, reconfigure or disable other controls, or clear validity reports

        this.consent_optin.addEventListener("change", function() {
            if (that.consent_optin.checked) {
                that.consent_optin.setCustomValidity("");
            }
        });

        this.citation_optin.addEventListener("change", function() {
            if (that.citation_optin.checked) {
                that.citation_optin.setCustomValidity("");
            }
        });

        this.include_bias_adjustments.addEventListener("change", function() {
            if (that.include_bias_adjustments.checked) {
                that.citation1.setAttribute("style","display:none;");
                that.citation2.setAttribute("style","display:inline;");
            } else {
                that.citation1.setAttribute("style","display:inline;");
                that.citation2.setAttribute("style","display:none;");
            }
        });

        this.time_step.addEventListener("change", function() {
            if (that.time_step.value != "N-daily") {
                // to prevent warnings in the browser console, remove validity warnings
                // on the N daily period that will be become non-focusable
                that.removeAlert(that.daily_time_step);
            }
            // if (that.time_step.value == "N-daily" || that.time_step.value == "annual") {
            //    var start_year = Number.parseInt(that.start_date_year.value);
            //    if (start_year == that.first_year && that.first_month > 1) {
                    // N-daily and annual timesteps require whole years to operate
                    // bump the start year up to the first complete year
            //        that.start_date_year.value = ""+(start_year+1);
            //    }
            // }
            that.configureYearMonthPickers();
            that.updateControlVisibility();
        });

        this.exclude_sea_ice.addEventListener("change", function() {
            if (!that.exclude_sea_ice.checked) {
                // to prevent warnings in the browser console, remove validity warnings
                // on the sea ice threshold that will be become non-focusable
                that.removeAlert(that.sea_ice_threshold);
            }
            that.updateControlVisibility();
        });

        this.email_address.addEventListener("change", function() {
            that.configureViewButton();
        });

        this.start_date_year.addEventListener("change",function() {
            that.configureDatePickers();
            that.configureYearMonthPickers();
        });

        this.end_date_year.addEventListener("change",function() {
            that.configureDatePickers();
            that.configureYearMonthPickers();
        });

        this.start_date_month.addEventListener("change",function() {
            that.configureDatePickers();
        });

        this.end_date_month.addEventListener("change",function() {
            that.configureDatePickers();
        });

        this.time_step.addEventListener("change",function() {
            that.configureDatePickers();
        });

        this.bounding_box_latitude_centre.addEventListener("change",function() {
            that.requested_lat = that.bounding_box_latitude_centre.value;
            that.updateBoundingBox();
        });

        this.bounding_box_longitude_centre.addEventListener("change",function() {
            that.requested_lon = that.bounding_box_longitude_centre.value;
            that.updateBoundingBox();
        });

        this.bounding_box_longitude_width.addEventListener("change",function() {
            that.bounding_box_longitude_centre.value = that.requested_lon;
            that.updateBoundingBox();
        });

        this.bounding_box_latitude_height.addEventListener("change",function() {
            that.bounding_box_latitude_centre.value = that.requested_lat;
            that.updateBoundingBox();
        });

        var latitude_resolutions = ["0.1", "0.15", "0.2", "0.25", "0.3", "0.4", "0.45", "0.5", "0.6", "0.75", "0.8", "0.9", "1.0", "1.2", "1.25", "1.5", "1.8", "2.0", "2.25", "2.4", "2.5", "3.0", "3.6", "3.75", "4.0", "4.5", "5.0"];
        var longitude_resolutions = ["0.1", "0.15", "0.2", "0.25", "0.3", "0.4", "0.45", "0.5", "0.6", "0.75", "0.8", "0.9", "1.0", "1.2", "1.25", "1.5", "1.6", "1.8", "2.0", "2.25", "2.4", "2.5", "3.0", "3.6", "3.75", "4.0", "4.5", "4.8", "5.0"];

        var time_resolutions = [];
        if (this.job_type == "regrid" || this.job_type == "region") {
           time_resolutions.push(["annual","Annual"]);
        }

        time_resolutions.push(["monthly","Monthly"]);
        time_resolutions.push(["10-day","10 day periods within month"]);
        time_resolutions.push(["5-day","5 day periods within month"]);
        time_resolutions.push(["N-daily","N-day periods within year"]);

        if (this.job_type == "timeseries" || this.job_type == "region") {
            time_resolutions.push(["daily","Daily"]);
        }

        this.configureSelect("time_step", time_resolutions, true);

        if (this.job_type == "regrid") {
            this.configureSelect("latitude_step",latitude_resolutions, false,false);
            this.configureSelect("longitude_step",longitude_resolutions, false,false);
            this.hideElement(this.bounding_box_latitude_group_row1);
            this.hideElement(this.bounding_box_latitude_group_row2);
            this.hideElement(this.bounding_box_longitude_group_row1);
            this.hideElement(this.bounding_box_longitude_group_row2);
            this.hideElement(this.timeseries_output_format_group);
            this.hideElement(this.bounding_box_map_group);
        } else {
            // region or timeseries
            this.hideElement(this.latitude_step_group);
            this.hideElement(this.longitude_step_group);
            if (this.job_type == "region") {
                this.hideElement(this.timeseries_output_format_group);
                this.hideElement(this.spatial_lambda_group);
            }
            this.configureBoundingBoxMap();
        }

        this.time_step.value = "5-day";
        this.latitude_step.value = "0.5";
        this.longitude_step.value = "0.5";

        // the view button shows and hides a list of the user's jobs
        this.view_btn.addEventListener('click', function(event) {
            if (that.job_view_open) {
                that.job_view_open = false;
                that.closeJobList();
                that.view_btn.innerHTML = "Show My Current Jobs";
            } else {
                that.job_view_open = true;
                that.openJobList();
                that.refreshJobList();
                that.view_btn.innerHTML = "Hide My Current Jobs";
            }
        });

        this.submit_btn.addEventListener('click', function(event) {
            that.submitForm();
        });

        this.refresh_btn.addEventListener('click', function(event) {
            that.refreshJobList();
        });

        this.configureViewButton();
        this.configureYearMonthPickers(); // first call establishes valid values for the year/month pickers
        this.setStartEndDefaults();           // this allows the defaults to be assigned
        this.configureYearMonthPickers(); // call in case year/month pickers need to be adjusted after defaults set
        this.configureDatePickers();

        if (self.bb_max_size>0) {
            $("bounding_box_longitude_width").setAttribute("max",""+self.bb_max_size);
            $("bounding_box_longitude_height").setAttribute("max",""+self.bb_max_size);
        }

        setInterval(function() {
            that.refreshJobList();
        },600000);   // auto refresh job list every 10 minutes

        this.updateControlVisibility();
    }

    configureBoundingBoxMap() {
        this.map = L.map('bounding_box_map', {
            center: [0,0],
            zoom: 3,
            crs: L.CRS.EPSG4326
        });

        // https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0
        var tiles = L.tileLayer.wms('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi', {
            layers: 'BlueMarble_NextGeneration',
            format: 'image/png',
	        attribution: '<a href="https://earthdata.nasa.gov/earth-observation-data">NASA EOSDIS GIBS</a>'
        }).addTo(this.map);

        this.updateBoundingBox();
    }

    computeMinLongitude(lon_centre,lon_width) {
        var lon_min = lon_centre - lon_width/2.0;
        // snap to 0.05 grid
        return Math.round(lon_min*20)/20
    }

    computeMinLatitude(lat_centre,lat_height) {
        var lat_min = lat_centre - lat_height/2.0;
        // snap to 0.05 grid
        return Math.round(lat_min*20)/20;
    }

    updateBoundingBox() {
        var centre_lon = Number.parseFloat(this.bounding_box_longitude_centre.value);
        var lon_width = Number.parseFloat(this.bounding_box_longitude_width.value);
        var centre_lat = Number.parseFloat(this.bounding_box_latitude_centre.value);
        var lat_height = Number.parseFloat(this.bounding_box_latitude_height.value);

        // first adjust the width and height to be on a 0.05 grid
        if (lon_width < 0.05) {
            lon_width = 0.05;
            this.bounding_box_longitude_width.value = "0.05";
        } else if (lon_width > this.bb_max_size) {
            lon_width = this.bb_max_size;
            this.bounding_box_longitude_width.value = ""+this.bb_max_size;
        } else {
            lon_width = this.snapToGridFloat(lon_width);
            this.bounding_box_longitude_width.value = this.snapToGrid(this.bounding_box_longitude_width.value);
        }

        if (lat_height < 0.05) {
            lat_height = 0.05;
            this.bounding_box_latitude_height.value = "0.05";
        } else if (lat_height > this.bb_max_size) {
            lat_height = this.bb_max_size;
            this.bounding_box_latitude_height.value = ""+this.bb_max_size;
        } else {
            lat_height = this.snapToGridFloat(lat_height);
            this.bounding_box_latitude_height.value = this.snapToGrid(this.bounding_box_latitude_height.value);
        }

        // now we need to adjust the lon (lat) center so that the box boundaries lie exactly on a 0.05 grid
        var min_lon = this.computeMinLongitude(centre_lon,lon_width);
        var min_lat = this.computeMinLatitude(centre_lat,lat_height);

        var bounds = [[min_lat, min_lon], [min_lat+lat_height, min_lon+lon_width]];

        var center_lat = min_lat + lat_height*0.5;
        var center_lon = min_lon + lon_width*0.5;

        this.bounding_box_latitude_centre.value = this.depictCenterLatLon(center_lat);
        this.bounding_box_longitude_centre.value = this.depictCenterLatLon(center_lon);

        // create an red rectangle
        if (this.bb_rect) {
            this.bb_rect.remove();
        }
        this.bb_rect = L.rectangle(bounds, {color: "#ff0000", weight: 1}).addTo(this.map);
        // zoom the map to the rectangle bounds
        this.map.fitBounds(bounds,{"maxZoom":this.map.getZoom()});
    }

    snapToGridFloat(value) {
        // convert value from string to float and then to nearest multiple of 0.05
        var f = Number.parseFloat(value);
        return (Math.round(f*20)/20);
    }

    snapToGrid(value) {
        // convert value from string to float and then to nearest multiple of 0.05, return as string
        return this.snapToGridFloat(value).toFixed(2);
    }

    depictCenterLatLon(lat_or_lon) {
        // convert a floating point value to a string and return it
        // use the minimum number of decimal places while avoiding truncation
        // assume that the maximum number of decimal places is 3
        var n = 3;
        var s = "";
        while(n >= 0) {
            s = lat_or_lon.toFixed(n);
            if (!s.endsWith("0")) {
                return s;
            }
            n = n-1;
        }
        return s;
    }

    // -----------------------------------------------------------------------------------------------------------------
    // form setup and configuration
    //

    configureDatePickers() {
        // for a given time resolution (yearly, monthly etc) show/hide/configure the
        // relevant start/end year/month/day controls
        switch(this.time_step.value) {
            case "annual":
                // regrid only
                this.configureMonthControls(false);
                this.configureDayControls(false,[],[]);
                break;
            case "N-daily":
                this.configureMonthControls(false);
                this.configureDayControls(false,[],[]);
                break;
            case "monthly":
                this.configureMonthControls(true);
                this.configureDayControls(false,[],[]);
                break;
            case "5-day":
                this.configureMonthControls(true);
                this.configureDayControls(true,[1,6,11,16,21,26],[5,10,15,20,25]);
                break;
            case "10-day":
                this.configureMonthControls(true);
                this.configureDayControls(true,[1,11,21],[10,20]);
                break;
            case "daily":
                // time series only
                this.configureMonthControls(true);
                this.configureDayControls(true,[],[]);
                break;
            default:
                break;
        }
    }

    configureYearMonthPickers() {
        var years = [];
        // work out the range of years to allow for selection
        var first_complete_year = this.first_year;
        if (this.first_month>1) {
            first_complete_year = this.first_year+1;
        }
        var first_valid_year = this.first_year;

        var last_complete_year = this.last_year;
        if (this.last_month<12) {
            last_complete_year = this.last_year-1;
        }
        var last_valid_year = this.last_year;

        // for annual or N-daily, allow complete years only
        if (this.time_step.value == "N-daily" || this.time_step.value == "annual") {
            // N-daily and annual timesteps require whole years to operate
            // bump the start year up to the first complete year
            first_valid_year = first_complete_year;
            last_valid_year = last_complete_year;
        }

        for (var year = first_valid_year; year <= last_valid_year; year++) {
            years.push(""+year);
        }

        // clip the currently selected year to the valid year range, if necessary
        if (Number.parseInt(this.start_date_year) < first_valid_year) {
            this.start_date_year.value = ""+first_valid_year;
        }
        if (Number.parseInt(this.start_date_year) > last_valid_year) {
            this.start_date_year.value = ""+last_valid_year;
        }
        if (Number.parseInt(this.end_date_year) < first_valid_year) {
            this.end_date_year.value = ""+first_valid_year;
        }
        if (Number.parseInt(this.end_date_year) > last_valid_year) {
            this.end_date_year.value = ""+last_valid_year;
        }

        this.configureSelect("start_date_year",years,false,true);


        this.configureSelect("end_date_year",years,false,false);
        var allmonths = [
            ["1", "January"],
            ["2", "February"],
            ["3", "March"],
            ["4", "April"],
            ["5", "May"],
            ["6", "June"],
            ["7", "July"],
            ["8", "August"],
            ["9", "September"],
            ["10", "October"],
            ["11", "November"],
            ["12", "December"]
        ];
        // configure the range of months to show in the start/end pickers
        // normally this is all months
        // ...however if the first year is selected (which is currently partially covered, for 1981)
        // don't include the first months of the year
        var slice_start = 0;
        var slice_end = 12;
        if (Number.parseInt(this.start_date_year.value) == this.first_year) {
            slice_start = this.first_month-1;
        }
        if (Number.parseInt(this.start_date_year.value) == this.last_year) {
            slice_end = this.last_month;
        }
        var startmonths = allmonths.slice(slice_start, slice_end);
        this.configureSelect("start_date_month",startmonths,true,true);

        slice_start = 0;
        slice_end = 12;
        if (Number.parseInt(this.end_date_year.value) == this.first_year) {
            slice_start = this.first_month-1;
        }
        if (Number.parseInt(this.end_date_year.value) == this.last_year) {
            slice_end = this.last_month;
        }
        var endmonths = allmonths.slice(slice_start, slice_end);
        this.configureSelect("end_date_month",endmonths,true,false);
    }

    setStartEndDefaults() {
        this.start_date_year.value = ""+default_start_year;
        this.start_date_month.value = ""+default_start_month;
        this.start_date_day.value = "1";

        this.end_date_year.value = ""+default_end_year;
        this.end_date_month.value = ""+default_end_month;
        this.end_date_day.value = ""+this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value);;
    }

    configureMonthControls(visible) {
        var visibility = (visible ? "visible" : "hidden");
        this.start_month_controls.setAttribute("style","visibility:"+visibility+";");
        this.end_month_controls.setAttribute("style","visibility:"+visibility+";");
    }

    configureDayControls(visible,valid_start_days,valid_end_days) {
        var visibility = (visible ? "visible" : "hidden");
        this.start_day_controls.setAttribute("style","visibility:"+visibility+";");
        this.end_day_controls.setAttribute("style","visibility:"+visibility+";");

        if (valid_end_days.length > 0) {
            var end_month_last_day = this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value);
            valid_end_days.push(end_month_last_day);
        }

        if (visible && valid_start_days.length==0 && valid_end_days.length==0) {
            // if the control is visible but the start and end day lists are empty, populate them with all days
            var last_day_in_start_month = this.getDaysInMonth(this.start_date_year.value,this.start_date_month.value);
            for(var day=1; day<=last_day_in_start_month;day+=1) {
                valid_start_days.push(day);
            }
            var last_day_in_end_month = this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value);
            for(var day=1; day<=last_day_in_end_month;day+=1) {
                valid_end_days.push(day);
            }
        }

        this.configureSelect("start_date_day",valid_start_days,false,true);
        this.configureSelect("end_date_day",valid_end_days,false,false);
    }

    updateControlVisibility() {
        // show or hide certain controls based on the current form settings
        this.makeVisible(this.n_daily_step_group,this.time_step.value == "N-daily");
        this.makeVisible(this.sea_ice_threshold_group,this.exclude_sea_ice.checked);
    }

    makeVisible(control,visible) {
        if (visible) {
            control.setAttribute("style","visibility:visible;");
        } else {
            control.setAttribute("style","visibility:hidden;");
        }
    }

    hideElement(control) {
        control.setAttribute("style","display:none;");
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Job list related
    //

    configureViewButton() {
        if (this.email_address.value != "") {
            this.view_btn.disabled = false;
        } else {
            this.view_btn.disabled = true;
        }
    }

    openJobList() {
        this.joblist.setAttribute("style","display:block;");
        this.jobtable.setAttribute("style","display:none;");
        this.nojobs.setAttribute("style","display:none;");
    }

    refreshJobList() {
        if (this.job_view_open) {
            var that = this;
            fetch('/view.json',{
                method: 'POST',
                mode: 'same-origin',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({"email_address":this.email_address.value})
            }).then((response) => {
                return response.json();
            }).then((data) => {
                that.updateJobList(data);
            });
        }
    }

    updateJobList(data) {
        this.jobtable.setAttribute("style","display:none;");
        this.nojobs.setAttribute("style","display:none;");
        this.jobtablebody.innerHTML = "";
        var running_jobs = data["running_jobs"];
        this.runningjobs.innerHTML = ""+running_jobs;
        var jobs = data["jobs"];
        if (jobs.length > 0) {
            var columns = ["id","submission_date","state","completion_date","expiry_date"];
            var date_columns = ["submission_date","completion_date","expiry_date"];
            for(var idx=0; idx<jobs.length; idx++) {
                var tr = document.createElement("tr");
                var job = jobs[idx];
                var job_id = job["id"];
                var new_tasks = job["new_tasks"];
                var running_tasks = job["running_tasks"];
                var completed_tasks = job["completed_tasks"];
                var failed_tasks = job["failed_tasks"];
                var spec_html = job["spec_html"];
                var download_links = job["download_links"];

                for(var jdx=0; jdx<date_columns.length; jdx++) {
                    var date_column = date_columns[jdx];
                    var utc_date_s = job[date_column];
                    if (utc_date_s) {
                        job[date_column] = this.convertDateStringUTC2Local(utc_date_s);
                    }
                }

                var total_tasks = new_tasks + running_tasks + completed_tasks + failed_tasks;

                // we will rename NEW jobs or RUNNING jobs where no tasks have yet started, to QUEUED
                if (job["state"] == "NEW" || (job["state"] == "RUNNING" && (running_tasks+completed_tasks+failed_tasks == 0))) {
                    job["state"] = "QUEUED";
                }

                if (job["state"] == "RUNNING") {
                    if (completed_tasks > 0) {
                        var percent_complete = (100.0 * completed_tasks) / total_tasks;
                        job["state"] = job["state"] + " ("+Math.floor(percent_complete) + "%)";
                    }
                }

                for(var jdx=0; jdx<columns.length;jdx++) {
                    var td = document.createElement("td");
                    var txt = document.createTextNode(job[columns[jdx]]);
                    td.appendChild(txt);

                    if (columns[jdx] == "id") {
                        if (download_links && download_links.length > 0) {
                            var p = document.createElement("p");
                            p.appendChild(document.createTextNode("Download Links:"));
                            td.appendChild(p);
                            for (var di = 0; di < download_links.length; di++) {
                                var label = download_links[di][0];
                                var url = download_links[di][1];
                                var p = document.createElement("p");
                                var a = document.createElement("a");
                                a.setAttribute("href", url);
                                a.setAttribute("target", "_blank");
                                a.appendChild(document.createTextNode(label));
                                p.appendChild(a);
                                td.appendChild(p);
                            }
                        }

                        var btn = document.createElement("button");
                        var btxt = document.createTextNode("Show Details");
                        btn.appendChild(btxt);
                        td.appendChild(btn);

                        var details = document.createElement("div");
                        td.appendChild(details);
                        var toggleFn = this.createViewParametersCallback(spec_html,btn,details,job_id);
                        if (!(job_id in this.job_parameters_open)) {
                            this.job_parameters_open[job_id] = false;
                        } else {
                            if (this.job_parameters_open[job_id]) {
                                // job parameters were opened already, so
                                this.job_parameters_open[job_id] = false;
                                toggleFn();   // will toggle back to true and re-open the parameters for the job
                            }
                        }
                        btn.onclick = toggleFn;
                    }
                    if (columns[jdx] == "state" && job["state"] == "COMPLETED") {
                        var btn = document.createElement("button");
                        var btxt = document.createTextNode("Resend Email");
                        btn.appendChild(btxt);
                        btn.onclick = this.createResendCallback(job_id);
                        td.appendChild(btn);
                    }
                    tr.appendChild(td);
                }
                this.jobtablebody.appendChild(tr);
            }
            this.jobtable.setAttribute("style","display:block;");
        } else {
            this.nojobs.setAttribute("style","display:block;");
        }
    }

    closeJobList() {
        this.joblist.setAttribute("style","display:none;");
    }

    createViewParametersCallback(spec_html,btn,details,job_id) {
        var that = this;
        return function() {
            if (that.job_parameters_open[job_id]) {
                details.innerHTML = "";
                btn.innerHTML = "Show Details";
            } else {
                details.innerHTML = spec_html;
                btn.innerHTML = "Hide Details";
            }
            that.job_parameters_open[job_id] = !that.job_parameters_open[job_id];
        }
    }

    // -----------------------------------------------------------------------------------------------------------------
    // resend mail callback
    //

    createResendCallback(job_id) {
        var that = this;
        return function() {
            that.resend(job_id);
        }
    }

    resend(job_id) {
        fetch('/resend.json',{
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({"job_id":job_id})
        }).then((response) => {
            return response.json();
        }).then((data) => {
            alert("E-mail Sent!");
        });
    }



    // -----------------------------------------------------------------------------------------------------------------
    // Utility functions
    //

    makeTwoDigits(s) {
        // make sure a string has at least two characters by adding leading 0s
        switch(s.length) {
            case 0:
                return "00";
            case 1:
                return "0"+s;
            default:
                return s;
        }
    }
    convertDateStringUTC2Local(date_str) {
        // parse the UTC date in the format YYYY-MM-DD HH:MM:SS
        var year = Number.parseInt(date_str.substring(0,4));
        var month = Number.parseInt(date_str.substring(5,7));
        var day = Number.parseInt(date_str.substring(8,10));
        var hour = Number.parseInt(date_str.substring(11,13));
        var min = Number.parseInt(date_str.substring(14,16));
        var sec = Number.parseInt(date_str.substring(18,19));

        var d = new Date(Date.UTC(year,month-1,day,hour,min,sec));
        return d.getFullYear()  + "-" + this.makeTwoDigits(""+(d.getMonth()+1)) + "-" + this.makeTwoDigits(""+d.getDate()) + " " +
this.makeTwoDigits(""+d.getHours()) + ":" + this.makeTwoDigits(""+d.getMinutes())
    }

    addHelp(label_id,help_text) {
        // add a help button to the <label> with the specified id and the help text in a tooltip
        var label = $(label_id);
        var img_ele = document.createElement("img");
        img_ele.setAttribute("title",help_text);
        img_ele.setAttribute("alt",help_text);
        img_ele.setAttribute("class","icon");
        img_ele.setAttribute("src","/images/help.svg");
        img_ele.setAttribute("tabindex","0");

        var that = this;
        var openfn = function(evt) {
             var rect = img_ele.getBoundingClientRect();
             var style = "display:block;position:fixed;left:"+rect.left+";top:"+rect.top+";";
             that.dialog.setAttribute("style",style);
             that.dialog_content.innerHTML = "";
             that.dialog_content.appendChild(document.createTextNode(help_text));
             that.dialog_content_close.focus();
             if (evt) {
                evt.stopPropagation();
                evt.preventDefault();
             }
        }
        img_ele.onclick = openfn;
        img_ele.onkeydown = function(evt) {
            if (evt.keyCode === 13) {
                openfn();
                evt.stopPropagation();
                evt.preventDefault();
            }
        }

        label.appendChild(img_ele);
    }

    configureSelect(select_id,options,with_label,default_to_first) {
        // configure a <select> with the specified id by adding <option>s with a defined value and label
        // if with_label==true, options should be an array of [value,label] arrays
        // if with_label==false, options should be an array of value strings, the labels will be the same as the values
        var ele = $(select_id);
        var old_value = ele.value;
        var old_value_index = -1;
        ele.innerHTML = "";
        for(var idx=0; idx<options.length; idx++) {
            var option = options[idx];
            var value = option;
            var label = option;
            if (with_label) {
                value = option[0];
                label = option[1];
            }
            if (value == old_value) {
                old_value_index = idx;
            }
            var option_ele = document.createElement("option");
            option_ele.setAttribute("value",value);
            var txt = document.createTextNode(label);
            option_ele.appendChild(txt);
            ele.appendChild(option_ele);
        }
        if (old_value_index >= 0) {
            // previously selected option is still valid - so select it
            ele.selectedIndex = old_value_index;
        } else {
            // any previously selected option is no longer valid
            // need to default to either the first or last option
            if (default_to_first) {
                ele.selectedIndex = 0;
            } else {
                ele.selectedIndex = options.length-1;
            }
        }
    }

    getDaysInMonth(year_s,month_s) {
        // given a year and month (in the range 1-12), return the last day in the month in range 28-31
        // input year and month are strings
        var year = Number.parseInt(year_s);        // convert to int
        var month = Number.parseInt(month_s)-1;    // convert to int range 0 - 11

        var next_month = month+1;
        if (next_month == 12) {
            next_month = 0;
            year += 1;
        }
        // passing 0 as the day-in-month should return the last day in the previous month
        var last_day_dt = new Date(year,next_month,0);
        return last_day_dt.getDate();
    }

    removeAlert(control) {
        // clear a validity alert on a control and remove it from the list of controls
        // used when a control is about to go out of focus
        if (this.alerted_controls.includes(control)) {
            control.setCustomValidity("");
            control.reportValidity();
            removeValue(that.alerted_controls,control);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // form submission - code dealing with validating and submitting the form
    //

    isFormValid(start_date_str,end_date_str) {
        // validate the form
        // start_date_str and end_date_str are the start and end dates collected as strings with format YYYY-MM-DD

        // first, clear any warnings from the last validation
        for(var idx=0; idx<this.alerted_controls.length; idx++) {
            this.alerted_controls[idx].setCustomValidity("");
            this.alerted_controls[idx].reportValidity();
        }
        this.alerted_controls = [];

        // basic checks (consent/citation optins and e-mail address)
        if (!this.email_address.validity.valid) {
            this.email_address.setCustomValidity("Please use a valid e-mail address");
            this.email_address.reportValidity();
            this.alerted_controls.push(this.email_address);
        }
        if (!this.consent_optin.checked) {
            this.consent_optin.setCustomValidity("You must consent to having your e-mail address stored");
            this.consent_optin.reportValidity();
            this.alerted_controls.push(this.consent_optin);
        }
        if (!this.citation_optin.checked) {
            this.citation_optin.setCustomValidity("You must consent to using the data under the CC BY 4.0 license");
            this.citation_optin.reportValidity();
            this.alerted_controls.push(this.citation_optin);
        }

        // check the N daily step only if N-daily time resolution is selected
        if (this.time_step.value == "N-daily") {
            var nday = Number(this.daily_time_step.value);
            if (Number.isNaN(nday) || !Number.isInteger(nday) || nday < 1 || nday > 365) {
                this.daily_time_step.setCustomValidity("The N-day period must be an integer in the range 1 to 365");
                this.daily_time_step.reportValidity();
                this.alerted_controls.push(this.daily_time_step);
            }
        }

        // check the sea ice threshold only if exclude sea ice is selected
        if (this.exclude_sea_ice.checked) {
            var sitv = Number(this.sea_ice_threshold.value);
            if (Number.isNaN(sitv) || !Number.isInteger(sitv) || sitv < 0 || sitv > 100) {
                this.sea_ice_threshold.setCustomValidity("The sea ice threshold % value must be an integer in the range 0 to 100");
                this.sea_ice_threshold.reportValidity();
                this.alerted_controls.push(this.sea_ice_threshold);
            }
        }

        // check tau is an integer > 0
        var tau = Number(this.tau.value);
        if (Number.isNaN(tau) || !Number.isInteger(tau) || tau <= 0) {
            this.tau.setCustomValidity("The tau value must be an integer > 0");
            this.tau.reportValidity();
            this.alerted_controls.push(this.tau);
        }

        // check lambda is a valid number and > 0
        var spatial_lambda = Number.parseFloat(this.spatial_lambda.value);
        if (Number.isNaN(spatial_lambda) || spatial_lambda < 0.0) {
            this.spatial_lambda.setCustomValidity("The spatial lambda value must be a number > 0");
            this.spatial_lambda.reportValidity();
            this.alerted_controls.push(this.spatial_lambda);
        }

        if (this.job_type == "timeseries" || this.job_type == "region") {
            // check time series specific controls

            // check latitude min and height
            var bb_lat_min = Number.parseFloat(this.bounding_box_latitude_centre.value);
            if (Number.isNaN(bb_lat_min) || bb_lat_min < -90.0 || bb_lat_min > 90.0) {
                this.bounding_box_latitude_centre.setCustomValidity("The latitude value must lie in the range from -90 to 90 degrees");
                this.bounding_box_latitude_centre.reportValidity();
                this.alerted_controls.push(this.bounding_box_latitude_centre);
            }
            var bb_lat_height = Number.parseFloat(this.bounding_box_latitude_height.value);
            if (Number.isNaN(bb_lat_height) || bb_lat_height < 0.05 || bb_lat_height > this.bb_max_size) {
                this.bounding_box_latitude_height.setCustomValidity("The latitude box height must lie in the range from 0.05 to "+this.bb_max_size+" degrees");
                this.bounding_box_latitude_height.reportValidity();
                this.alerted_controls.push(this.bounding_box_latitude_height);
            }

            // check longitude min and width
            var bb_lon_min = Number.parseFloat(this.bounding_box_longitude_centre.value);
            if (Number.isNaN(bb_lon_min) || bb_lon_min < -180.0 || bb_lon_min > 180.0) {
                this.bounding_box_longitude_centre.setCustomValidity("The longitude value must lie in the range from -180 to 180 degrees");
                this.bounding_box_longitude_centre.reportValidity();
                this.alerted_controls.push(this.bounding_box_longitude_centre);
            }
            var bb_lon_width = Number.parseFloat(this.bounding_box_longitude_width.value);
            if (Number.isNaN(bb_lon_width) || bb_lon_width < 0.05 || bb_lon_width > this.bb_max_size) {
                this.bounding_box_longitude_width.setCustomValidity("The longitude box width must lie in the range from 0.05 to "+this.bb_max_size+" degrees");
                this.bounding_box_longitude_width.reportValidity();
                this.alerted_controls.push(this.bounding_box_longitude_width);
            }
        }

        // checks on the start and end date
        if (start_date_str >= end_date_str) {
           // if the start date is greater than the end date, its a bit tricky to figure out which of the
           // year / month / day pickers to report an error on...
           var sy = Number.parseInt(this.start_date_year.value);
           var sm = Number.parseInt(this.start_date_month.value);
           var sd = Number.parseInt(this.start_date_day.value);
           var ey = Number.parseInt(this.end_date_year.value);
           var em = Number.parseInt(this.end_date_month.value);
           var ed = Number.parseInt(this.end_date_day.value);

           var alert_control;
           switch(this.time_step.value) {
                case "annual":
                case "N-daily":
                    alert_control = this.end_date_year;
                    break;
                case "monthly":
                    if (sy > ey) {
                        alert_control = this.end_date_year;
                    } else {
                        alert_control = this.end_date_month;
                    }
                    break;
                default:
                    if (sy > ey) {
                        alert_control = this.end_date_year;
                    } else if (sm > em) {
                        alert_control = this.end_date_month;
                    } else {
                        alert_control = this.end_date_day;
                    }
                    break;
           }
           alert_control.setCustomValidity("Start date must be before end date");
           alert_control.reportValidity();
           this.alerted_controls.push(alert_control);
        }

        return (this.alerted_controls.length == 0);
    }

    submitForm() {
        // called when the form is submitted
        // check that the form values are valid
        // then dispatch a submission request to the service

        var that = this;

        var start_date_value = "";
        var end_date_value = "";

        switch(this.time_step.value) {
            case "annual":
            case "N-daily":
                start_date_value = this.start_date_year.value+"-01-01";
                end_date_value = this.end_date_year.value+"-12-31";
                break;
            case "monthly":
                start_date_value = this.start_date_year.value+"-"+this.makeTwoDigits(this.start_date_month.value)+"-01";
                end_date_value = this.end_date_year.value+"-"+this.makeTwoDigits(this.end_date_month.value)+"-"+this.makeTwoDigits(this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value));
                break;
            default:
                start_date_value = this.start_date_year.value+"-"+this.makeTwoDigits(this.start_date_month.value)+"-"+this.makeTwoDigits(this.start_date_day.value);
                end_date_value = this.end_date_year.value+"-"+this.makeTwoDigits(this.end_date_month.value)+"-"+this.makeTwoDigits(this.end_date_day.value);
                break;
        }

        if (this.isFormValid(start_date_value,end_date_value)) {

            // OK, form appears to be valid

            // create the specification for the job to pass to the service
            var spec = {
                "time_step":this.time_step.value,
                "n_daily_step":this.daily_time_step.value,
                "email_address":this.email_address.value,
                "start_date":start_date_value,
                "end_date":end_date_value,
                "exclude_sea_ice":this.exclude_sea_ice.checked,
                "sea_ice_threshold":this.sea_ice_threshold.value,
                "anomaly_or_absolute":this.anomaly_or_absolute.value,
                "spatial_lambda":this.spatial_lambda.value,
                "tau":this.tau.value,
                "generate_sea_ice_fraction":this.generate_sea_ice_fraction.checked,
                "subscription_optin":this.subscription_optin.checked,
                "job_type":this.job_type,
                "include_bias_adjustments":this.include_bias_adjustments.checked
            }

            if (this.job_type == "timeseries" || this.job_type == "region") {
                // daily is equivalent to N-daily,N=1
                if (this.time_step.value == "daily") {
                    spec["time_step"] = "N-daily";
                    spec["n_daily_step"] = "1";
                }
                var min_lon = this.computeMinLongitude(this.bounding_box_longitude_centre.value,this.bounding_box_longitude_width.value);
                var min_lat = this.computeMinLatitude(this.bounding_box_latitude_centre.value,this.bounding_box_latitude_height.value);

                spec["bounding_box_longitude_min"] = min_lon;
                spec["bounding_box_longitude_width"] = this.bounding_box_longitude_width.value;
                spec["bounding_box_latitude_min"] = min_lat;
                spec["bounding_box_latitude_height"] = this.bounding_box_latitude_height.value;
                if (this.job_type == "timeseries") {
                    spec["timeseries_output_format"] = this.timeseries_output_format.value;
                }
            } else {
                spec["longitude_step"] = this.longitude_step.value;
                spec["latitude_step"] = this.latitude_step.value;
            }

            // console.log("Posting job with spec: "+JSON.stringify(spec,null,2));

            fetch('/submit.json',{
                method: 'POST',
                mode: 'same-origin',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify(spec)
            }).then((response) => {
                return response.json();
            }).then((data) => {
                var message = data["message"];
                alert(message); // could do this more nicely with a modal than an alert
                // refresh the job list now so the new job shows up (if the job list is open)
                that.refreshJobList();
            });
        }
    }
}

var form = null;

// set up a callback to create the above Form object once the page has loaded
window.addEventListener("load",function() {
    form = new Form(job_type);
});