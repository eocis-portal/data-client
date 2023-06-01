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

from typing import Union

class ListBuilder:

    def __init__(self):
        self.items = []

    def add(self, item:Union[str,"ListBuilder"]):
        self.items.append(item)

    def emit(self, indent):
        s = " "*indent + "<ul>"
        for item in self.items:
            s += " "*indent

            if isinstance(item,str):
                s += "<li>"
                s += item
                s += "</li>\n"
            else:
                s += "\n"
                s += item.emit(indent+4)
                s += " "*indent
                s += "</li>\n"
        return s


def get_html_description(job):

        """
        Return a summary of the job spec.
        """
        spec = job.get_spec()
        lb = ListBuilder()
        lb.add("Variables")
        vl = ListBuilder()
        for variable in spec["VARIABLES"]:
            vl.add(variable)
        lb.add(vl)
        return lb.emit(0)
