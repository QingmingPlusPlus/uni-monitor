<script setup lang="ts">
import FactoryDashboardView from '../../pages/factory-dashboard/components/FactoryDashboardView/FactoryDashboardView.vue'
import { useDepartmentDashboard } from '../../pages/factory-dashboard/composables/useDepartmentDashboard'

const { dashboardData, alarmItems, selectionConfig, selectedDepartment, selectDepartment, selectProcess, clearProcess, openDevice, refreshCard } = useDepartmentDashboard('pc')
</script>

<template>
  <FactoryDashboardView
    class="pc-factory-dashboard"
    :show-daily-report="false"
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

<style scoped src="../factory-dashboard.css"></style>
