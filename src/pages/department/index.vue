<script setup lang="ts">
import FactoryDashboardView from '../factory-dashboard/components/FactoryDashboardView/FactoryDashboardView.vue'
import { useDepartmentDashboard } from '../factory-dashboard/composables/useDepartmentDashboard'

const { dashboardData, alarmItems, selectionConfig, selectedDepartment, selectDepartment, selectProcess, clearProcess, openDevice, refreshCard } = useDepartmentDashboard()
</script>

<template>
  <FactoryDashboardView
    :data="dashboardData"
    :alarms="alarmItems"
    :selection-config="selectionConfig"
    :selected-department="selectedDepartment"
    :selected-process="null"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @clear-process="clearProcess"
    @open-device="openDevice"
    @refresh-dashboard="refreshCard"
  />
</template>
