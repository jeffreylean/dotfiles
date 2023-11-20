#!/bin/bash

while true; do
    lid_state=$(cat /proc/acpi/button/lid/LID0/state | awk '{print $2}')
    if [ "$lid_state" = "closed" ]; then
        xrandr --output eDP-1 --off # Replace LVDS1 with your laptop monitor identifier
    else
        xrandr --output eDP-1 --auto # Replace LVDS1 with your laptop monitor identifier
    fi
    sleep 5 # Check every 5 seconds
done
