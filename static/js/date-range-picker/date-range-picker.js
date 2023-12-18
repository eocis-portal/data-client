/*
    MIT License

    Copyright (c) 2023 Niall McCarroll

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

function create_date_range_pickers(start_year_id, start_month_id, start_month_controls_id, start_day_id, start_day_controls_id,
                end_year_id, end_month_id, end_month_controls_id, end_day_id, end_day_controls_id) {
    let picker = new date_range_picker(start_year_id, start_month_id, start_month_controls_id, start_day_id, start_day_controls_id,
                end_year_id, end_month_id, end_month_controls_id, end_day_id, end_day_controls_id);
    return picker;
}


class date_range_picker {
    
    $(id) {
        return document.getElementById(id);
    }

    constructor(start_year_id, start_month_id, start_month_controls_id, start_day_id, start_day_controls_id,
                end_year_id, end_month_id, end_month_controls_id, end_day_id, end_day_controls_id) {

        /* locate controls from the page */
        this.start_date_year = this.$(start_year_id);
        this.start_date_month = this.$(start_month_id);
        this.start_date_day = this.$(start_day_id);

        this.start_day_controls = this.$(start_day_controls_id);
        this.start_month_controls = this.$(start_month_controls_id);

        this.end_date_year = this.$(end_year_id);
        this.end_date_month = this.$(end_month_id);
        this.end_date_day = this.$(end_day_id);

        this.end_day_controls = this.$(end_day_controls_id);
        this.end_month_controls = this.$(end_month_controls_id);

        /* hold the currently selected date range */
        this.start_year = undefined;
        this.start_month = undefined;
        this.start_day = undefined;

        this.end_year = undefined;
        this.end_month = undefined;
        this.end_day = undefined;

        this.callback_fn = null;

        this.first_year = null;
        this.first_month = null;
        this.last_year = null;
        this.last_month = null;
        this.time_step = null;

        this.days_visible = false;
        this.months_visible = false;

        this.month_names = ["January","February","March","April","May","June","July","August","September","October","November","December"];

        this.seasonal_startmonths = [3, 6, 9, 12];
        this.seasonal_endmonths = [2,5,8, 11];
        this.allmonths =  [1,2,3,4,5,6,7,8,9,10,11,12];

        this.time_step = "daily";

        this.bind_controls();
    }

    define_callback(callback_fn) {
        this.callback_fn = callback_fn;
    }

    bind_controls() {

        this.start_date_year.addEventListener("change",(evt) => {
            this.start_year = Number.parseInt(evt.target.value);
            this.refresh();
            this.callback();
        });

        this.end_date_year.addEventListener("change",(evt) => {
            this.end_year = Number.parseInt(evt.target.value);
            this.refresh();
            this.callback();
        });

        this.start_date_month.addEventListener("change",(evt) => {
            this.start_month = Number.parseInt(evt.target.value);
            this.refresh();
            this.callback();
        });

        this.end_date_month.addEventListener("change",(evt) => {
            this.end_month = Number.parseInt(evt.target.value);
            this.refresh();
            this.callback();
        });

        this.start_date_day.addEventListener("change",(evt) => {
            this.start_day = Number.parseInt(evt.target.value);
            this.refresh();
            this.callback();
        });

        this.end_date_day.addEventListener("change",(evt) => {
            this.end_day = Number.parseInt(evt.target.value);
            this.refresh();
            this.callback();
        });
    }

    get_start_date() {
        return new Date(Date.UTC(this.start_year,this.start_month-1,this.start_day));
    }

    get_end_date() {
        return new Date(Date.UTC(this.end_year,this.end_month-1,this.end_day));
    }

    callback() {
        let start_date = this.get_start_date();
        let end_date = this.get_end_date();
        if (this.checkValid(start_date, end_date)) {
            if (this.callback_fn) {
                this.callback_fn(start_date, end_date);
            }
        } else {
            if (this.callback_fn) {
                this.callback_fn(undefined, undefined);
            }
        }
    }

    configure(first_year, first_month, first_day, last_year, last_month, last_day, time_period) {
        this.first_year = first_year;
        this.first_month = first_month;
        this.first_day = first_day;
        this.last_year = last_year;
        this.last_month = last_month;
        this.last_day = last_day;

        this.first_date = new Date(Date.UTC(this.first_year,this.first_month-1,this.first_day));
        this.last_date = new Date(Date.UTC(this.last_year,this.last_month-1,this.last_day));

        if (this.first_date > this.last_date) {
            throw "Configuration failed.  First date must be not be after last date.";
        }
        this.change_timestep(time_period);
    }

    is_valid_start(dt) {
        let day = dt.getUTCDate();
        let mon = dt.getUTCMonth()+1;
        switch(this.time_step) {
            case "daily":
                return true;
            case "5-day":
                return [1, 6, 11, 16, 21, 26].includes(day);
            case "10-day":
                return [1, 11, 21].includes(day);
            case "monthly":
                return (day === 1);
            case "seasonal":
                return (day === 1) && [3,6,9,12].includes(mon);
            case "annual":
                return (day === 1) && (mon === 1);
        }
    }

    is_valid_end(dt) {
        let day = dt.getUTCDate();
        let mon = dt.getUTCMonth()+1;
        let days_in_month = this.get_days_in_month(dt.getUTCFullYear(),mon);
        switch(this.time_step) {
            case "daily":
                return true;
            case "5-day":
                return [5,10,15,20,25].includes(day) || (day === days_in_month);
            case "10-day":
                return [10, 20].includes(day) || (day === days_in_month);
            case "monthly":
                return (day === days_in_month);
            case "seasonal":
                return (day === days_in_month) && [2,5,8,11].includes(mon);
            case "annual":
                return (day === 31) && (mon === 12);
        }
    }

    expand_month_names(month_indexes) {
        let r = [];
        month_indexes.forEach(idx => {
            r.push([String(idx),this.month_names[idx-1]]);
        });
        return r;
    }

    add_days(orig_date, days_to_add) {
        var d = new Date(orig_date);
        d.setDate(d.getDate() + days_to_add);
        return d;
    }

    change_timestep(time_step) {
        let original_time_step = this.time_step;
        this.time_step = time_step;

        this.days_visible = false;
        this.months_visible = false;

        switch(this.time_step) {
            case "daily":
            case "5-day":
            case "10-day":
                this.days_visible = true;
                this.months_visible = true;
                break;
            case "annual":
                break;
            case "monthly":
            case "seasonal":
                this.months_visible = true;
                break;
        }

        // reset start and end date to start/end of range (or the closest dates that are valid for the time step)
        let start_dt = new Date(Date.UTC(this.first_year,this.first_month-1,this.first_day));
        let end_dt = new Date(Date.UTC(this.last_year,this.last_month-1,this.last_day));

        let valid_start_dt = undefined;
        while( start_dt < end_dt) {
            if (this.is_valid_start(start_dt)) {
                valid_start_dt = start_dt;
                break;
            }
            start_dt = this.add_days(start_dt,1);
        }
        if (valid_start_dt === undefined) {
            this.time_step = original_time_step;
            throw "Change time step failed, no valid periods within given range";
        }

        let valid_end_dt = undefined;
        while( end_dt > valid_start_dt) {
            if (this.is_valid_end(end_dt)) {
                valid_end_dt = end_dt;
                break;
            }
            end_dt = this.add_days(end_dt,-1);
        }
        if (valid_end_dt === undefined) {
            this.time_step = original_time_step;
            throw "Change time step failed, no valid periods within given range";
        }

        // time step is valid, set the start and end dates

        this.start_day = valid_start_dt.getUTCDate();
        this.start_month = valid_start_dt.getUTCMonth()+1;
        this.start_year = valid_start_dt.getUTCFullYear();

        this.end_day = valid_end_dt.getUTCDate();
        this.end_month = valid_end_dt.getUTCMonth()+1;
        this.end_year = valid_end_dt.getUTCFullYear();

        this.refresh();
        this.callback();
    }

    get_valid_start_years() {
       // work out the range of end years to allow for selection

        let years = [];
        for (let year = this.first_year; year <= this.last_year; year++) {
            let dt = new Date(Date.UTC(year,this.start_month-1,this.start_day));
            if (dt >= this.first_date && dt <= this.last_date) {
                years.push(year);
            }
        }
        return years;
    }

    get_valid_end_years() {
        // work out the range of end years to allow for selection
        let years = [];
        for (let year = this.first_year; year <= this.last_year; year++) {
            let dt = new Date(Date.UTC(year,this.end_month-1,this.end_day));
            if (dt >= this.first_date && dt <= this.last_date) {
                years.push(year);
            }
        }
        return years;
    }

    get_valid_startmonths() {
        let months = [];
        switch(this.time_step) {
            case "seasonal":
                // seasonal based on DJF, MAM, JJA, SON
                months = this.seasonal_startmonths;
                break;
            case "annual":
                months = [1];
                break;
            default:
                months = this.allmonths;
                break;
        }
        let valid_months = [];
        months.forEach(month => {
            let d = new Date(Date.UTC(this.start_year,month-1, this.start_day));
            if (d >= this.first_date && d <= this.last_date) {
                valid_months.push(month);
            }
        });
        return valid_months;
    }

    get_valid_endmonths() {
        let months = [];
        switch(this.time_step) {
            case "seasonal":
                // seasonal based on DJF, MAM, JJA, SON
                months = this.seasonal_endmonths;
                break;
            case "annual":
                months = [12];
                break;
            default:
                months = this.allmonths;
                break;
        }

        let valid_months = [];
        months.forEach(month => {
            let day = this.end_day;
            if (this.timestep === "annual" || this.time_step === "seasonal") {
                day = this.get_days_in_month(this.end_year, month);
            }
            let d = new Date(Date.UTC(this.end_year,month-1, day));
            if (d <= this.last_date && d >= this.first_date) {
                valid_months.push(month);
            }
        });
        return valid_months;
    }

    get_valid_startdays() {
        let last_day_in_start_month = this.get_days_in_month(this.start_year, this.start_month);
        let days = [];
        switch(this.time_step) {
            case "5-day":
                days = [1, 6, 11, 16, 21, 26];
                break;
            case "10-day":
                days = [1, 11, 21];
                break;
            case "daily":
                for (let day = 1; day <= last_day_in_start_month; day += 1) {
                    days.push(day);
                }
                break;
            case "annual":
            case "seasonal":
                days = [1];
                break;
        }

        let valid_days = [];
        days.forEach(day => {
            let d = new Date(Date.UTC(this.start_year,this.start_month-1, day));
            if (d >= this.first_date && d <= this.last_date) {
                valid_days.push(day);
            }
        });

        return valid_days;
    }

    get_valid_enddays() {
        let days = [];
        let last_day_in_end_month = this.get_days_in_month(this.end_year, this.end_month);
        switch(this.time_step) {
            case "5-day":
                days = [5, 10, 15, 20, 25];
                days.push(last_day_in_end_month);
                break;
            case "10-day":
                days = [10, 20];
                days.push(last_day_in_end_month);
                break;
           case "daily":
                for (let day = 1; day <= last_day_in_end_month; day += 1) {
                    days.push(day);
                }
                break;
            case "annual":
            case "seasonal":
                days = [last_day_in_end_month];
                break;
        }

        let valid_days = [];
        days.forEach(day => {
            let d = new Date(Date.UTC(this.end_year,this.end_month-1, day));
            if (d >= this.first_date && d <= this.last_date) {
                valid_days.push(day);
            }
        });

        return valid_days;
    }


    refresh() {
        /* repopulate the selects based on the current start and end date */
        /* try to prevent the user from selecting an invalid date */

        switch(this.time_step) {
            case "annual":
                this.start_month = 1;
                this.end_month = 12;
                this.start_day = 1;
                this.end_day = 31;
                break;
            case "seasonal":
            case "monthly":
                this.start_day = 1;
                this.end_day = this.get_days_in_month(this.end_year,this.end_month);
                break;
        }

        /* configure the year pickers */
        let startyears = this.get_valid_start_years();
        let endyears = this.get_valid_end_years();
        this.configure_select(this.start_date_year, this.start_year, startyears,false);
        this.configure_select(this.end_date_year, this.end_year, endyears,false);

        /* configure the month pickers */
        let startmonths = this.expand_month_names(this.get_valid_startmonths());
        let endmonths = this.expand_month_names(this.get_valid_endmonths());

        this.configure_select(this.start_date_month, this.start_month, startmonths,true);
        this.configure_select(this.end_date_month, this.end_month, endmonths,true);

        let months_visibility = (this.months_visible ? "visible" : "hidden");
        this.start_month_controls.setAttribute("style","visibility:"+months_visibility+";");
        this.end_month_controls.setAttribute("style","visibility:"+months_visibility+";");

        /* configure day pickers */
        let days_visibility = (this.days_visible ? "visible" : "hidden");
        this.start_day_controls.setAttribute("style","visibility:"+days_visibility+";");
        this.end_day_controls.setAttribute("style","visibility:"+days_visibility+";");

        let startdays = this.get_valid_startdays();
        let enddays = this.get_valid_enddays();

        this.configure_select(this.start_date_day, this.start_day, startdays,false,true);
        this.configure_select(this.end_date_day, this.end_day, enddays,false,false);
    }

    configure_select(ele,v,options,with_label) {
        // configure a <select> with the specified id by adding <option>s with a defined value and label
        // if with_label==true, options should be an array of [value,label] arrays
        // if with_label==false, options should be an array of value strings, the labels will be the same as the values
        ele.innerHTML = "";
        let index = 0;
        let s = String(v);
        for(let idx=0; idx<options.length; idx++) {
            let option = options[idx];
            let value = String(option);
            let label = String(option);
            if (with_label) {
                value = option[0];
                label = option[1];
            }
            if (value === s) {
                index = idx;
            }
            let option_ele = document.createElement("option");
            option_ele.setAttribute("value",value);
            let txt = document.createTextNode(label);
            option_ele.appendChild(txt);
            ele.appendChild(option_ele);
        }
        ele.selectedIndex = index;
    }

    get_days_in_month(year,month) {
        // given a year and month (in the range 1-12), return the last day in the month in range 28-31
        month = month-1;    // convert to int range 0 - 11
        let next_month = month+1;
        if (next_month == 12) {
            next_month = 0;
            year += 1;
        }
        // passing 0 as the day-in-month should return the last day in the previous month
        let last_day_dt = new Date(year,next_month,0);
        return last_day_dt.getDate();
    }

    checkValid(start_date, end_date) {
        this.removeAlert();
        // checks on the start and end date
        if (start_date >= end_date) {
           // if the start date is greater than the end date, its a bit tricky to figure out which of the
           // year / month / day pickers to report an error on...
           let sy = Number.parseInt(this.start_date_year.value);
           let sm = Number.parseInt(this.start_date_month.value);
           let sd = Number.parseInt(this.start_date_day.value);
           let ey = Number.parseInt(this.end_date_year.value);
           let em = Number.parseInt(this.end_date_month.value);
           let ed = Number.parseInt(this.end_date_day.value);

           let alert_control = null;
           switch(this.time_step.value) {
                case "annual":
                    alert_control = this.end_date_year;
                    break;
                case "monthly":
                case "seasonal":
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