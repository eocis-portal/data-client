

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
    constructor() {

        this.job_label = "";

        // first bind elements in the page to member variables

        this.form = $("form");
        var that = this;
        this.submitter_id = $("submitter_id");
        this.bundle = $("bundle");
        this.variables = $("variables");
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

        this.request_type = $("request_type");
        this.request_type.addEventListener("change", (evt) => {
            this.requestTypeUpdated();
        });

        this.longitude_step_group = $("longitude_step_group");
        this.latitude_step_group = $("latitude_step_group");

        this.longitude_step = $("longitude_step");
        this.latitude_step = $("latitude_step");


        this.output_format = $("output_format");

        this.requestTypeUpdated();

        // specific to time series or region
        this.bounding_box_longitude_centre = $("bounding_box_longitude_centre");
        this.bounding_box_longitude_width = $("bounding_box_longitude_width");
        this.bounding_box_latitude_centre = $("bounding_box_latitude_centre");
        this.bounding_box_latitude_height = $("bounding_box_latitude_height");


        this.bounding_box_map = $("bounding_box_map");
        this.requested_lat = 0.0;
        this.requested_lon = 0.0;

        // define the year range over which valid input data is available.
        // first year may not have data available from the first month.
        // start_year, start_month and end_year are globals that are set up from template parameters in app.html
        this.first_year = start_year;
        this.first_month = start_month;
        this.last_month = end_month;
        this.last_year = end_year;


        this.start_date_year = ""
        this.dt_picker = new dt_picker("start_date_year", "start_date_month", "start_month_controls", "start_date_day", "start_day_controls",
                "end_date_year", "end_date_month", "end_month_controls", "end_date_day", "end_day_controls");
        this.last_day = this.dt_picker.getDaysInMonth(""+end_year, ""+end_month);
        this.dt_picker.configureYearMonthPickers(2000,1, 1, 2020, 12, 31, "daily");
        this.dt_picker.defineCallback((start,end) => {
            console.log(start + " => " + end);
        });


        this.consent = $("consent");
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
        this.addHelp("consent","You must consent to...");

        // regrid specific
        this.addHelp("latitude_step_label","The target latitude resolution. This must be a multiple of 0.05 degrees and a factor of 180 degrees. It must also not be greater than 5 degrees.");
        this.addHelp("longitude_step_label","The target longitude resolution. This must be a multiple of 0.05 degrees and a factor of 360 degrees. It must also not be greater than 5 degrees.");

        // time series/region specific
        this.addHelp("bounding_box_longitude_centre_label","Set the degrees of longitude of the centre of the bounding box over which the "+this.job_label+" will be computed.  As the box width is adjusted this will be automatically slightly adjusted so that the bounding box is aligned to the 0.05 grid.");
        this.addHelp("bounding_box_longitude_width_label","Set the width in degrees of longitude of the bounding box over which the "+this.job_label+" will be computed.  Must be a multiple of 0.05 degrees and no more than "+this.bb_max_size+" degrees.");
        this.addHelp("bounding_box_latitude_centre_label","Set the degrees of latitude of the centre of the bounding box over which the "+this.job_label+" will be computed.  As the box height is adjusted this will be automatically slightly adjusted so that the bounding box is aligned to the 0.05 grid.");
        this.addHelp("bounding_box_latitude_height_label","Set the height in degrees of latitude of the bounding box over which the "+this.job_label+" will be computed.  Must be a multiple of 0.05 degrees and no more than "+this.bb_max_size+" degrees.");

        // time series specific
        this.addHelp("output_format_label","Choose the output format.");

        // set up event handlers on most of the controls
        // the handlers will typically enable, reconfigure or disable other controls, or clear validity reports

        this.consent.addEventListener("change", function() {
           if (that.consent_optin.checked) {
                that.consent_optin.setCustomValidity("");
            }
        });


        this.time_step.addEventListener("change", function() {
            if (that.time_step.value != "N-daily") {
                // to prevent warnings in the browser console, remove validity warnings
                // on the N daily period that will be become non-focusable
                that.removeAlert(that.daily_time_step);
            }
            that.dt_picker.changeTimeStep(that.time_step.value);
        });


        this.submitter_id.addEventListener("change", function() {
            that.configureViewButton();
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
        time_resolutions.push(["annual","Annual"]);
        time_resolutions.push(["N-daily","N-day periods within year"]);
        time_resolutions.push(["monthly","Monthly"]);
        time_resolutions.push(["10-day","10 day periods within month"]);
        time_resolutions.push(["5-day","5 day periods within month"]);
        time_resolutions.push(["daily","Daily"]);

        this.configureSelect("time_step", time_resolutions, true);

        this.configureSelect("latitude_step",latitude_resolutions, false,false);
        this.configureSelect("longitude_step",longitude_resolutions, false,false);

        this.configureBoundingBoxMap();

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

        if (self.bb_max_size>0) {
            $("bounding_box_longitude_width").setAttribute("max",""+self.bb_max_size);
            $("bounding_box_longitude_height").setAttribute("max",""+self.bb_max_size);
        }

        setInterval(function() {
            that.refreshJobList();
        },600000);   // auto refresh job list every 10 minutes

        this.updateControlVisibility();

        this.loadBundles();
    }

    loadBundles() {
        fetch("/metadata/bundles").then(r => r.json()).then(obj => this.setBundles(obj));
    }

    setBundles(bundle_list) {
        bundle_list.forEach((bundle) => {
            let elt = document.createElement("option");
            elt.appendChild(document.createTextNode(bundle.name));
            elt.setAttribute("value",bundle.id);
            this.bundle.appendChild(elt);
        });
        if (bundle_list.length) {
            this.loadVariables(bundle_list[0].id);
        }
    }

    loadVariables(bundle_id) {
        fetch("/metadata/bundles/"+bundle_id+"/variables").then(r => r.json()).then(obj => this.setVariables(obj));
    }

    setVariables(variable_list) {
        variable_list.forEach((variable) => {
            let elt = document.createElement("option");
            elt.appendChild(document.createTextNode(variable.dataset_name+"/"+variable.variable_name));
            elt.setAttribute("value",variable.id);
            this.variables.appendChild(elt);
        });
    }

    requestTypeUpdated() {
        alert(this.request_type.value);
        if (this.request_type.value == "timeseries") {
            this.hideElement(this.longitude_step_group);
            this.hideElement(this.latitude_step_group);
            this.configureSelect("output_format",[["csv","CSV"],["netcdf","NetCDF4"]],true,true);
        } else {
            this.showElement(this.longitude_step_group);
            this.showElement(this.latitude_step_group);
            this.configureSelect("output_format",[["geotiff","GeoTIFF"],["netcdf","NetCDF4"]],true,true);
        }
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

    setStartEndDefaults() {
        this.dt_picker.configureYearMonthPickers(
            default_start_year,
            default_start_month,
            1,
            default_end_year,
            default_end_month,
            this.getDaysInMonth(default_end_year,default_end_month),
            "5-day");
    }

    updateControlVisibility() {
        // show or hide certain controls based on the current form settings
        this.makeVisible(this.n_daily_step_group,this.time_step.value == "N-daily");
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

    showElement(control) {
        control.setAttribute("style","display:block;");
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Job list related
    //

    configureViewButton() {
        if (this.submitter_id.value != "") {
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
                body: JSON.stringify({"submitter_id":this.submitter_id.value})
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

    isFormValid() {
        // validate the form
        // start_date_str and end_date_str are the start and end dates collected as strings with format YYYY-MM-DD

        // first, clear any warnings from the last validation
        for(var idx=0; idx<this.alerted_controls.length; idx++) {
            this.alerted_controls[idx].setCustomValidity("");
            this.alerted_controls[idx].reportValidity();
        }
        this.alerted_controls = [];

        // basic checks (consent/citation optins and e-mail address)
        if (!this.submitter_id.validity.valid) {
            this.submitter_id.setCustomValidity("Please use a valid submitter id");
            this.submitter_id.reportValidity();
            this.alerted_controls.push(this.submitter_id);
        }
        if (!this.consent.checked) {
            this.consent.setCustomValidity("You must consent to having your e-mail address stored");
            this.consent.reportValidity();
            this.alerted_controls.push(this.consent);
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

        return (this.alerted_controls.length == 0);
    }

    submitForm() {
        // called when the form is submitted
        // check that the form values are valid
        // then dispatch a submission request to the service

        var that = this;

        var start_date_value = "";
        var end_date_value = "";

        let start_date = this.dt_picker.get_start_date();
        let end_date = this.dt_picker.get_end_date();

        start_date_value = start_date.getFullYear()+"-"+this.makeTwoDigits(1+start_date.getMonth())+"-"+this.makeTwoDigits(start_date.getDate());
        end_date_value = end_date.getFullYear()+"-"+this.makeTwoDigits(1+end_date.getMonth())+"-"+this.makeTwoDigits(end_date.getDate());

        if (this.isFormValid()) {

            // OK, form appears to be valid

            // create the specification for the job to pass to the service
            var spec = {
                "time_step":this.time_step.value,
                "n_daily_step":this.daily_time_step.value,
                "submitter_id":this.submitter_id.value,
                "start_date":start_date_value,
                "end_date":end_date_value,
                "consent":this.consent.checked,
                "include_bias_adjustments":this.include_bias_adjustments.checked
            }


            var min_lon = this.computeMinLongitude(this.bounding_box_longitude_centre.value,this.bounding_box_longitude_width.value);
            var min_lat = this.computeMinLatitude(this.bounding_box_latitude_centre.value,this.bounding_box_latitude_height.value);

            spec["bounding_box_longitude_min"] = min_lon;
            spec["bounding_box_longitude_width"] = this.bounding_box_longitude_width.value;
            spec["bounding_box_latitude_min"] = min_lat;
            spec["bounding_box_latitude_height"] = this.bounding_box_latitude_height.value;
            spec["output_format"] = this.output_format.value;

            spec["longitude_step"] = this.longitude_step.value;
            spec["latitude_step"] = this.latitude_step.value;


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
    form = new Form();
});