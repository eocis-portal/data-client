
function test(start_year_id, start_month_id, start_month_controls_id, start_day_id, start_day_controls_id,
                end_year_id, end_month_id, end_month_controls_id, end_day_id, end_day_controls_id) {
    var picker = new dt_picker(start_year_id, start_month_id, start_month_controls_id, start_day_id, start_day_controls_id,
                end_year_id, end_month_id, end_month_controls_id, end_day_id, end_day_controls_id);
    picker.configureYearMonthPickers(2000,1, 2020, 12, "5-day");
    picker.defineCallback((start,end) => {
        console.log(start + " => " + end);
    });

    var change_time_step = document.getElementById("change_time_step");
    change_time_step.addEventListener("change",function(evt) {
       let value = change_time_step.value;
       picker.changeTimeStep(value);
    });
    picker.changeTimeStep(change_time_step.value);
}

function $(id) {
    return document.getElementById(id);
}

class dt_picker {

    constructor(start_year_id, start_month_id, start_month_controls_id, start_day_id, start_day_controls_id,
                end_year_id, end_month_id, end_month_controls_id, end_day_id, end_day_controls_id) {
        this.start_date_year = $(start_year_id);
        this.start_date_month = $(start_month_id);
        this.start_date_day = $(start_day_id);

        this.start_day_controls = $(start_day_controls_id);
        this.start_month_controls = $(start_month_controls_id);

        this.end_date_year = $(end_year_id);
        this.end_date_month = $(end_month_id);
        this.end_date_day = $(end_day_id);

        this.end_day_controls = $(end_day_controls_id);
        this.end_month_controls = $(end_month_controls_id);

        this.callback_fn = null;
        this.first_year = null;
        this.first_month = null;
        this.last_year = null;
        this.last_month = null;
        this.time_step = null;

        this.days_visible = false;
        this.months_visible = false;

        this.alerted_control = null;

        this.bindControls();
    }

    defineCallback(callback_fn) {
        this.callback_fn = callback_fn;
    }

    bindControls() {
        var listener = () => {
            this.refresh();
            this.callback();
        }

        this.start_date_year.addEventListener("change",listener);

        this.end_date_year.addEventListener("change",listener);

        this.start_date_month.addEventListener("change",listener);

        this.end_date_month.addEventListener("change",listener);

        this.start_date_day.addEventListener("change",listener);

        this.end_date_day.addEventListener("change",listener);
    }

    callback() {
        var start_date = new Date(
            Number.parseInt(this.start_date_year.value),
            Number.parseInt(this.start_date_month.value)-1,
            Number.parseInt(this.start_date_day.value));
        var end_date = new Date(
            Number.parseInt(this.end_date_year.value),
            Number.parseInt(this.end_date_month.value)-1,
            Number.parseInt(this.end_date_day.value));
        if (this.checkValid(start_date,end_date)) {
            if (this.callback_fn) {
                this.callback_fn(start_date, end_date);
            }
        }
    }

    configureYearMonthPickers(first_year, first_month, last_year, last_month, time_step) {
        this.first_year = first_year;
        this.first_month = first_month;
        this.last_year = last_year;
        this.last_month = last_month;
        this.time_step = time_step;

        this.refresh();
    }

    changeTimeStep(time_step) {
        this.time_step = time_step;
        this.refresh();
    }

    refresh() {
        this.valid_start_days = [];
        this.valid_end_days = [];
        this.days_visible = false;
        this.months_visible = false;

        switch(this.time_step) {
            case "5-day":
                this.valid_start_days = [1, 6, 11, 16, 21, 26];
                this.valid_end_days = [5, 10, 15, 20, 25];
                this.days_visible = true;
                this.months_visible = true;
                break;
            case "10-day":
                this.valid_start_days = [1, 11, 21];
                this.valid_end_days = [10, 20];
                this.days_visible = true;
                this.months_visible = true;
                break;
            case "annual":
            case "N-daily":
                this.start_date_month.value = "1";
                this.end_date_month.value = "12";
                this.start_date_day.value = "1";
                this.end_date_day.value = "31";
                break;
            case "monthly":
                this.start_date_day.value = "1";
                this.end_date_day.value =  ""+this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value);
                this.months_visible = true;
                break;
        }

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
        if (this.time_step == "N-daily" || this.time_step == "annual") {
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

        this.configureSelect(this.start_date_year,years,false,true);
        this.configureSelect(this.end_date_year,years,false,false);

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
        this.configureSelect(this.start_date_month,startmonths,true,true);

        slice_start = 0;
        slice_end = 12;
        if (Number.parseInt(this.end_date_year.value) == this.first_year) {
            slice_start = this.first_month-1;
        }
        if (Number.parseInt(this.end_date_year.value) == this.last_year) {
            slice_end = this.last_month;
        }
        var endmonths = allmonths.slice(slice_start, slice_end);
        this.configureSelect(this.end_date_month,endmonths,true,false);

        var months_visibility = (this.months_visible ? "visible" : "hidden");
        this.start_month_controls.setAttribute("style","visibility:"+months_visibility+";");
        this.end_month_controls.setAttribute("style","visibility:"+months_visibility+";");

        var days_visibility = (this.days_visible ? "visible" : "hidden");
        this.start_day_controls.setAttribute("style","visibility:"+days_visibility+";");
        this.end_day_controls.setAttribute("style","visibility:"+days_visibility+";");

        if (this.valid_end_days.length > 0) {
            var end_month_last_day = this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value);
            this.valid_end_days.push(end_month_last_day);
        }

        if (this.valid_start_days.length==0 && this.valid_end_days.length==0) {
            // if the start and end day lists are empty, populate them with all days
            var last_day_in_start_month = this.getDaysInMonth(this.start_date_year.value,this.start_date_month.value);
            for(var day=1; day<=last_day_in_start_month;day+=1) {
                this.valid_start_days.push(day);
            }
            var last_day_in_end_month = this.getDaysInMonth(this.end_date_year.value,this.end_date_month.value);
            for(var day=1; day<=last_day_in_end_month;day+=1) {
                this.valid_end_days.push(day);
            }
        }

        this.configureSelect(this.start_date_day, this.valid_start_days,false,true);
        this.configureSelect(this.end_date_day, this.valid_end_days,false,false);
    }

    configureSelect(ele,options,with_label,default_to_first) {
        // configure a <select> with the specified id by adding <option>s with a defined value and label
        // if with_label==true, options should be an array of [value,label] arrays
        // if with_label==false, options should be an array of value strings, the labels will be the same as the values
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

    checkValid(start_date, end_date) {
        this.removeAlert();
        // checks on the start and end date
        if (start_date >= end_date) {
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
           this.alerted_control = alert_control;
           return false;
        } else {
            return true;
        }
    }


    removeAlert() {
        // clear a validity alert on a control and remove it from the list of controls
        // used when a control is about to go out of focus
        if (this.alerted_control) {
            this.alerted_control.setCustomValidity("");
            this.alerted_control.reportValidity();
            this.alerted_control = null;
        }
    }

}