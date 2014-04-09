(function() {
    var root = this;

    var timestep = {

        // API of objects returned by methods of the timestep object
        API: {
            /* Return previous available time of the stepping. If
               current time is available, return current time. If the
               stepping has available times only in the future, return
               the earliest available time or undefined depending on
               clamp. If no times are available, return undefined.

               @param {Date} d Date from which to return next available time.
               @param {boolean | undefined} clamp If false, return undefined if there is no previous available time. If true, clamp to first available time instead. Default value is true.
            */
            previousAvailable: function(d, clamp) {
            },

            /* Return next available time of the stepping. If current
               time is available, return current time. If the stepping
               has available times only in the past, return the latest
               available time or undefined depencing on clamp. May
               return d. If no times are available, return undefined.

               @param {Date} d Date from which to return next available time.
               @param {boolean | undefined} clamp If false, return undefined if there is no next available time. If true, clamp to last available time instead. Default value is true.
            */
            nextAvailable: function(d, clamp) {
            },

            /* Return up to N times previous to d. Will return less
             * times if there are not enough times previous to d. */
            previousTimes: function(d, n) {
            },
            
            /* Return up to N times subsequent to d. Will return less
             * times if there are not enough times subsequent to d. */
            nextTimes: function(d, n) {
            },

            /* Return all available times within given interval [start, end] */
            timesForInterval: function(start, end) {
            },

            /* Return the end time of this time range, or undefined if there is no end time. */
            endTime: function() {
            },

            /* Return the start time of this time range, or undefined if there is no start time. */
            startTime: function() {
            }
            
        },
        
        list: function(times) {
            if (times.length < 1) {
                throw "Need at least one element for list-based timestepper"
            }
            return {
                times: times, // array of Date objects, must be ordered
                first: times[0],
                last: times[times.length-1],

                previousAvailable: function(d, clamp) {
                    if (clamp === false && d.getTime() < this.first.getTime()) {
                        return undefined;
                    } else {
                        return _.reduce(this.times, function(memo, val) {return val <= d ? val : memo}, this.first)
                    }
                },

                nextAvailable: function(d, clamp) {
                    if (clamp === false && d.getTime() > this.last.getTime()) {
                        return undefined;
                    } else {
                        return _.reduceRight(this.times, function(memo, val) {return val >= d ? val : memo}, this.last)
                    }
                },

                previousTimes: function(d, n) {
                    var i = _.sortedIndex(this.times, d);
                    var indices = _.range(i-1, i-n-1, -1).reverse();
                    var validIndices = _.filter(indices, function(i) {return i >= 0});
                    return _.map(validIndices, function(i) {return this.times[i]}, this);
                },

                nextTimes: function(d, n) {
                    var i = _.sortedIndex(this.times, d);
                    var indices = _.range(i, i+n)
                    var validIndices = _.filter(indices, function(i) {return i < this.times.length}, this);
                    return _.map(validIndices, function(i) {return this.times[i]}, this);
                },

                timesForInterval: function(start, end) {
                    return _.filter(this.times, function(t) {return start <= t && t <= end});
                },

                endTime: function() {
                    return this.last;
                },

                startTime: function() {
                    return this.first;
                }
                
            }
        },
        
        restricted: function(start, end, timestep) {
            var timestepObj;
            if (typeof timestep === "number") {
                timestepObj = this.regular(timestep, start);
            } else {
                timestepObj = timestep;
            }

            function interpretClamp(clamp) {
                return clamp === undefined || clamp;
            }

            return {
                start: start, // Date object, may be undefined to indicate no restriction, must noe be undefined if timestep is number and not a timestep object
                end: end, // Date object, may be undefined to indicate no restriction
                regularTimestepTiming: timestepObj,

                _selectNearestEnd: function(d) {
                    var clampedStart = start === undefined ? undefined : this.regularTimestepTiming.nextAvailable(start, true);
                    var clampedEnd = end === undefined ? undefined : this.regularTimestepTiming.previousAvailable(end, true);
                    
                    var dStart = clampedStart === undefined ? Infinity : Math.abs(clampedStart.getTime() - d.getTime());
                    var dEnd = clampedEnd === undefined ? Infinity : Math.abs(clampedEnd.getTime() - d.getTime());

                    if (dStart < dEnd && this._within(clampedStart)) {
                        return clampedStart;
                    } else if (this._within(clampedEnd)) {
                        return clampedEnd;
                    } else {
                        return undefined;
                    }
                },
                _within: function(d) {
                    return (start === undefined || d >= start) && (end === undefined || d <= end);
                },
                previousAvailable: function(d, clamp) {
                    var clamped = interpretClamp(clamp);
                    if (clamped) {
                        var clampedD = this.regularTimestepTiming.previousAvailable(d, true);
                        if (clampedD !== undefined && this._within(clampedD)) {
                            return clampedD;
                        } else {
                            // clamped d outside range, see if clamped endpoint is within
                            return this._selectNearestEnd(d);
                        }
                    } else {
                        if (this._within(d)) {
                            // d inside range, return underlying range result if it's 
                            var potentialResult = this.regularTimestepTiming.previousAvailable(d, false);
                            if (potentialResult !== undefined && this._within(potentialResult)) {
                                return potentialResult;
                            } else {
                                return undefined;
                            }
                        } else if (end === undefined || d.getTime() > end.getTime()) {
                            // d after range, return clamped result
                            return this.previousAvailable(d, true);
                        } else {
                            // No clamp and d outside range
                            return undefined;
                        }
                        
                    }
                },
                nextAvailable: function(d, clamp) {
                    var clamped = interpretClamp(clamp);
                    if (clamped) {
                        var clampedD = this.regularTimestepTiming.nextAvailable(d, true);
                        if (clampedD !== undefined && this._within(clampedD)) {
                            // clamped d outside range, see if clamped endpoint is within
                            return clampedD;
                        } else {
                            return this._selectNearestEnd(d);
                        }
                    } else {
                        if (this._within(d)) {
                            // d inside range, return underlying range result
                            var potentialResult = this.regularTimestepTiming.nextAvailable(d, false);
                            if (potentialResult !== undefined && this._within(potentialResult)) {
                                return potentialResult;
                            } else {
                                return undefined;
                            }
                        } else if (start === undefined || d.getTime() < start.getTime()) {
                            // d before range, return clamped result
                            return this.nextAvailable(d, true);
                        } else {
                            // No clamp and d outside range
                            return undefined;
                        }
                        
                    }
                },
                previousTimes: function(d, n) {
                    return _.filter(this.regularTimestepTiming.previousTimes(d, n), this._within);
                },
                nextTimes: function(d, n) {
                    return _.filter(this.regularTimestepTiming.nextTimes(d, n), this._within);
                },
                timesForInterval: function(start, end) {
                    return _.filter(this.regularTimestepTiming.timesForInterval(start, end), this._within);
                },
                endTime: function() {
                    var end = _.min([this.end, this.regularTimestepTiming.endTime()]);
                    if (end === Infinity) {
                        return undefined;
                    } else {
                        return end;
                    }
                },
                startTime: function() {
                    var start = _.max([this.start, this.regularTimestepTiming.startTime()]);
                    if (start === -Infinity) {
                        return undefined;
                    } else {
                        return start;
                    }
                }
            }
        },
        
        regular: function(timestep, anchor) {

            if (typeof timestep !== "number") {
                throw "timestep must be a number, was: " + timestep;
            }

            if (! _.isDate(anchor)) {
                throw "anchor must be a date, was: " + anchor;
            }

            // timestep is in milliseconds
            // anchor must be a Date object or undefined
            // if undefined, will anchor to current time with minutes, seconds and milliseconds truncated
            if (anchor === undefined) {
                var defaultAnchor = new Date(); 
                defaultAnchor.setMinutes(0);
                defaultAnchor.setSeconds(0);
                defaultAnchor.setMilliseconds(0);
                anchor = defaultAnchor;
                console.log("Using default anchor: " + anchor);
            }

            if (timestep === undefined || timestep === null || isNaN(timestep)) {
                console.log("Bad timestep", timestep);
                throw "Bad timestep: " + timestep;
            }

            return {
                anchor: anchor,
                timestep: timestep,
                
                /* Return previous available time of the stepping. If the
                   stepping has available times only in the future,
                   return the earliest available time. If passed-in
                   time is available, return passed-in time.*/
                previousAvailable: function(d) {
                    return this._prevOrNext(d, -1, true);
                },

                /* Return next available time of the stepping. If the
                   stepping has available times only in the future,
                   return the earliest available time. If passed-in
                   time is available, return passed-in time.*/
                nextAvailable: function(d) {
                    return this._prevOrNext(d, 1, true);
                },
                
                /* Return up to N times previous to d. Will return less
                 * times if there are not enough times previous to d. */
                previousTimes: function(d, n) {
                    return this._generateTimes(d, n, -1);
                },
                
                /* Return up to N times subsequent to d. Will return less
                 * times if there are not enough times subsequent to d. */
                nextTimes: function(d, n) {
                    return this._generateTimes(d, n, 1);
                },

                timesForInterval: function(start, end) {
                    var numTimes = Math.floor((end.getTime()-start.getTime())/timestep);
                    var alignedStart = this._prevOrNext(start, -1, true);
                    if (alignedStart.getTime() === start.getTime()) {
                        // aligned, numTimes+1 to include end time
                        return this._generateTimes(new Date(start.getTime()-1), numTimes+1, 1);
                    } else {
                        return this._generateTimes(new Date(start.getTime()-1), numTimes, 1);
                    }
                },

                startTime: function() {
                    return undefined;
                },

                endTime: function() {
                    return undefined;
                },
                
                /* Align given time to the times generated from anchor
                   and timestep.  Dir specifies in which direction
                   from d the aligned time is produced: -1 for past,
                   any other value for future. allowCurrent determines
                   whether d itself may be returned if it is already
                   aligned: true allows d to be returned, false doesn't. */
                _prevOrNext: function(d, dir, allowCurrent) {
                    var timestep = this.timestep;
                    var diff = d.getTime() - this.anchor.getTime()
                    var previousTime;
                    var nextTime;
                    var msSincePrevious = diff % timestep;
                    if (msSincePrevious === 0) {
                        if (allowCurrent) {
                            previousTime = d.getTime();
                            nextTime = d.getTime();
                        } else {
                            previousTime = d.getTime() - timestep;
                            nextTime = d.getTime() + timestep;
                        }
                    } else {
                        var ordAdjust = (diff < 0)*timestep; // Adjust by one timestep if d is before anchor
                        previousTime = this.anchor.getTime() + diff - msSincePrevious - ordAdjust;
                        nextTime = this.anchor.getTime() + diff - msSincePrevious + timestep - ordAdjust;
                    }

                    if (dir === -1) {
                        return new Date(previousTime);
                    } else {
                        return new Date(nextTime);
                    }
                },
                
                /* Return n next/previous times of _d */
                _generateTimes: function(_d, n, dir) {
                    var d = this._prevOrNext(_d, dir, false); // align _d to its next/previous time
                    var timestep = this.timestep;
                    var result = [];
                    for (i = 0; i < n; i++) {
                        var d2 = new Date(d.getTime() + dir*(i)*timestep);
                        result.push(d2)
                    }
                    return result;
                },
                
            }
        }
    }

    var _ = _;

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = timestep;
        }
        exports.timestep = timestep;
        _ = require('underscore')
    } else {
        root.timestep = timestep;
        _ = window._;
    }

})(this);
