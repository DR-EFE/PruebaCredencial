import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';


interface ChartData {
    label: string;
    value: number;
    color: string;
}

interface Materia {
    nombre: string;
}

interface Asistencia {
    estado: string;
}

interface Sesion {
    id: string;
    fecha: string;
    tema: string;
    materia: Materia;
    materia_id: string;
}

type BarChartProps = {
    data: ChartData[];
}

const BarChart = ({ data }: BarChartProps) => {
    const maxValue = Math.max(...data.map((d: ChartData) => d.value), 1); // Avoid division by zero
    return (
        <View style={styles.chartContainer}>
            {data.map((item: ChartData, index: number) => (
                <View key={index} style={styles.barWrapper}>
                    <View style={[styles.bar, { height: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }]} />
                    <Text style={styles.barValue}>{item.value}</Text>
                    <Text style={styles.barLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
};


export default function ReportDetailScreen() {
    const { sesionId } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<Sesion | null>(null);
    const [stats, setStats] = useState({ presentes: 0, tardanzas: 0, faltas: 0 });

    const loadReportDetails = useCallback(async () => {
        if (!sesionId) return;
        setLoading(true);
        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('sesiones')
                .select('*, materia:materias(nombre)')
                .eq('id', sesionId)
                .single();

            if (sessionError) throw sessionError;
            setSession(sessionData);

            const { data: asistencias, error: asistError } = await supabase
                .from('asistencias')
                .select('estado', { count: 'exact' })
                .eq('sesion_id', sesionId);

            if (asistError) throw asistError;

            const presentes = asistencias?.filter((a: Asistencia) => a.estado === 'presente').length || 0;
            const tardanzas = asistencias?.filter((a: Asistencia) => a.estado === 'tardanza').length || 0;
            
            const { count: totalInscritos, error: countError } = await supabase
                .from('inscripciones')
                .select('*', { count: 'exact', head: true })
                .eq('materia_id', sessionData.materia_id)
                .eq('estado_inscripcion', 'activa');

            if (countError) throw countError;

            const faltas = (totalInscritos ?? 0) - (presentes + tardanzas);

            setStats({ presentes, tardanzas, faltas: faltas > 0 ? faltas : 0 });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [sesionId]);

    useEffect(() => {
        loadReportDetails();
    }, [loadReportDetails]);

    if (loading) {
        return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
    }

    if (!session) {
        return <View style={styles.centerContainer}><Text>No se encontró la sesión.</Text></View>;
    }
    
    const chartData: ChartData[] = [
        { label: 'Presentes', value: stats.presentes, color: '#10b981' },
        { label: 'Tardanzas', value: stats.tardanzas, color: '#f59e0b' },
        { label: 'Faltas', value: stats.faltas, color: '#ef4444' },
    ];

    const totalStudents = stats.presentes + stats.tardanzas + stats.faltas;
    const attendancePercentage = totalStudents > 0 ? Math.round(((stats.presentes + stats.tardanzas) / totalStudents) * 100) : 0;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{session.materia.nombre}</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.dateText}>{format(new Date(session.fecha), 'EEEE, dd MMMM yyyy')}</Text>
                <Text style={styles.topicText}>{session.tema || 'Sin tema'}</Text>

                <View style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Resumen de Asistencia</Text>
                    <BarChart data={chartData} />
                </View>

                <View style={styles.summaryCard}>
                    <Text style={styles.cardTitle}>Estadísticas</Text>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Porcentaje de Asistencia</Text>
                        <Text style={styles.statValue}>{attendancePercentage}%</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Total de Alumnos</Text>
                        <Text style={styles.statValue}>{totalStudents}</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    content: {
        padding: 20,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    topicText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111827',
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: 150,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 16,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    bar: {
        width: 35,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    barValue: {
        position: 'absolute',
        top: -20,
        fontWeight: 'bold',
        color: '#374151',
    },
    barLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#6b7280',
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    statLabel: {
        fontSize: 16,
        color: '#374151',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
});
