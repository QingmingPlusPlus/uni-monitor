<script setup lang="ts">
import FactoryDashboardView from '../factory-dashboard/components/FactoryDashboardView/FactoryDashboardView.vue'
import { useProcessDashboard } from '../factory-dashboard/composables/useProcessDashboard'

const { dashboardData, alarmItems, selectionConfig, selectedDepartment, selectedProcess, selectDepartment, selectProcess, clearProcess, openDevice, refreshCard } = useProcessDashboard()
</script>

<template>
  <FactoryDashboardView
    :data="dashboardData"
    :alarms="alarmItems"
    :selection-config="selectionConfig"
    :selected-department="selectedDepartment"
    :selected-process="selectedProcess"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @clear-process="clearProcess"
    @open-device="openDevice"
    @refresh-dashboard="refreshCard"
  />
</template>
