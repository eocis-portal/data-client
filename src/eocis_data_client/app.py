# -*- coding: utf-8 -*-

#    EOCIS data-client

#    Copyright (C) 2020-2023  National Centre for Earth Observation (NCEO)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <https://www.gnu.org/licenses/>.

import os.path
import sys
import logging
import os

logging.basicConfig(level=logging.DEBUG)

from flask import Flask, render_template, request, send_from_directory, abort, jsonify

from eocis_data_manager.store import Store
from eocis_data_manager.schema_operations import SchemaOperations
from eocis_data_manager.job_manager import JobManager
from eocis_data_manager.job_operations import JobOperations
from eocis_data_manager.job import Job
from eocis_data_manager.config import Config
from eocis_data_manager.time_steps import TimeSteps

from job_formatter import get_html_description

# flask initialisation and configuration (see config.py)

rootdir = os.path.abspath(os.path.join(os.path.split(__file__)[0],"..",".."))

app = Flask(__name__,template_folder=os.path.join(rootdir,"templates"))


app.config.from_object(Config)

output_folder = app.config["OUTPUT_PATH"]

# obtain the persistent store
store = Store(app.config["DATABASE_PATH"])

start_year = app.config["START_YEAR"]
start_month = app.config["START_MONTH"]
end_year = app.config["END_YEAR"]
end_month = app.config["END_MONTH"]

default_start_year = app.config["DEFAULT_START_YEAR"]
default_start_month = app.config["DEFAULT_START_MONTH"]
default_end_year = app.config["DEFAULT_END_YEAR"]
default_end_month = app.config["DEFAULT_END_MONTH"]


task_quota = app.config["TASK_QUOTA"]
job_quota = app.config["JOB_QUOTA"]

TIME_STEP_LABELS = {
    TimeSteps.ANNUAL: "Annual",
    TimeSteps.N_DAILY: "N-day periods within year",
    TimeSteps.MONTHLY: "Monthly",
    TimeSteps.DEKAD: "10 day periods within month",
    TimeSteps.PENTAD: "5 day periods within month",
    TimeSteps.DAILY: "Daily"
}


def collect_download_links(job_id: str):
    links = []
    output_path = os.path.join(Config.OUTPUT_PATH, job_id)
    for filename in os.listdir(output_path):
        if filename.endswith(".zip"):
            links.append((filename, "/outputs/" + job_id + "/" + filename))
    return links

GENERIC_ERROR = "An internal error occurred and it was not possible to complete your request."

class App:
    """
    Define the routes and handlers for the web service
    """

    logger = logging.getLogger("app")

    def __init__(self):
        pass


    ####################################################################################################################
    # Main end points, invoked from the app.html webapp
    #

    @staticmethod
    @app.route('/submit.json',methods = ['POST'])
    def submit():
        """Handle submitted form.  Perform server side validation and add a new job into the database."""
        try:
            # create a job
            with JobOperations(store) as t:
                job = Job.create(request.json)
                t.create_job(job)
                job_id = job.get_job_id()

            # create tasks from the job and queue them for execution
            jm = JobManager(store)
            jm.create_tasks(job_id)

            msg = "Thank you.  Your job was successfully submitted and has been assigned the JOB-ID: %s. " % (job_id)
            return jsonify({"job_id":job_id,"message":msg})
        except:
            App.logger.exception("submit")
            return jsonify({"message": GENERIC_ERROR})


    @staticmethod
    @app.route('/view.json', methods=['POST'])
    def view():
        """Handle request for list of running jobs per user."""
        try:
            content = request.json
            submitter_id = content['submitter_id']
            job_list = []

            with JobOperations(store) as t:
                running_job_count = t.count_jobs_by_state([Job.STATE_RUNNING])
                jobs = t.list_jobs_by_submitter_id(submitter_id)
                jm = JobManager(store)
                for job in jobs:
                    job_detail = job.serialise(t)
                    job_detail["html_description"] = get_html_description(job)
                    if job.get_state() == Job.STATE_COMPLETED:
                        job_detail["download_links"] = \
                             [[label,url] for (label,url) in collect_download_links(job.get_job_id())]
                    job_list.append(job_detail)

            return jsonify({"jobs": job_list, "running_jobs": running_job_count})
        except:
            App.logger.exception("view")
            return jsonify({"jobs": [], "running_jobs": "?"})

    ####################################################################################################################
    # Service static files
    #

    @staticmethod
    @app.route('/metadata/bundles', methods=['GET'])
    def get_bundles():
        t = SchemaOperations(store)
        bundles = []
        for b in t.list_bundles():
            bundles.append({"id": b.bundle_id, "name": b.bundle_name, "spec":b.spec})
        return jsonify(bundles)

    @staticmethod
    @app.route('/metadata/bundles/<bundle_id>', methods=['GET'])
    def get_variables(bundle_id=None):

        with SchemaOperations(store) as t:
            bundle = t.get_bundle(bundle_id)
            spatial_resolutions = []
            temporal_resolutions = []
            for resolution in bundle.spec["spatial_resolutions"]:
                spatial_resolutions.append([resolution,resolution])
            for resolution in bundle.spec["temporal_resolutions"]:
                temporal_resolutions.append([resolution,TIME_STEP_LABELS[TimeSteps(resolution)]])

            variables = []
            for ds_id in bundle.dataset_ids:
                ds = t.get_dataset(ds_id)
                for variable in ds.variables:
                    variable_id = ds.dataset_id + ":" + variable.variable_id
                    variables.append({"id":variable_id,"variable_name":variable.variable_name,"dataset_name":ds.dataset_name})
        return jsonify({"variables":variables,
                        "spatial_resolutions": spatial_resolutions,
                        "temporal_resolutions": temporal_resolutions})

    ####################################################################################################################
    # Service static files
    #

    @staticmethod
    @app.route('/', methods=['GET'])
    @app.route('/index.html', methods=['GET'])
    def fetch():
        """Serve the main page containing the regridding form"""
        return render_template('app.html', title="EOCIS Data", subtitle="Service",
                               service_name="EOCIS data service",
                               start_year=start_year, start_month=start_month, end_year=end_year, end_month=end_month,
                               default_start_year=default_start_year, default_start_month=default_start_month,
                               default_end_year=default_end_year, default_end_month=default_end_month,
                               output_formats="The dataset will be prepared in netcdf4 format at the temporal and spatial resolution specified in the request form below.",
                               summary="Obtain L4 sea and ocean surface temperature datasets in your chosen spatial and temporal resolution.")




    @staticmethod
    @app.route('/css/<path:path>',methods = ['GET'])
    def send_css(path):
        """serve CSS files"""
        return send_from_directory(os.path.join(rootdir,'static','css'), path)

    @staticmethod
    @app.route('/js/<path:path>', methods=['GET'])
    def send_js(path):
        """serve JS files"""
        return send_from_directory(os.path.join(rootdir,'static','js'), path)

    @staticmethod
    @app.route('/images/<path:path>', methods=['GET'])
    def send_images(path):
        """serve image files"""
        return send_from_directory(os.path.join(rootdir,'static','images'), path)

    @staticmethod
    @app.route('/favicon.ico', methods=['GET'])
    def send_favicon():
        """serve favicon"""
        return send_from_directory(os.path.join(rootdir,'static','images'), 'favicon.ico')

    @staticmethod
    @app.route('/outputs/<path:path>', methods=['GET'])
    def send_data(path):
        """serve data files"""
        if os.path.exists(os.path.join(output_folder,path)):
            return send_from_directory(output_folder, path)
        else:
            abort(404)

    @app.errorhandler(404)
    def page_not_found(error):
        return render_template('404.html', title='404'), 404

    @app.after_request
    def add_header(r):
        r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        r.headers["Pragma"] = "no-cache"
        r.headers["Expires"] = "0"
        return r


if __name__ == '__main__':
    try:
        app.run(host=app.config["HOST"],port=app.config["PORT"])
    except:
        App.logger.exception("web service")
        sys.exit(-1)



